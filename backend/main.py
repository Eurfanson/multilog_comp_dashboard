import traceback
import math
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pm4py.objects.conversion.log import converter as log_converter
from pm4py.algo.discovery.dfg import algorithm as dfg_discovery
from scipy.stats import shapiro, kruskal, f_oneway, ttest_ind
from statsmodels.stats.multicomp import pairwise_tukeyhsd
import scikit_posthocs as sp
import numpy as np
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ---------------- Helpers ----------------
def eta_squared_anova(stat, df_between, df_total):
    return stat * df_between / (stat * df_between + df_total) if df_total > 0 else None

def epsilon_squared_kruskal(H, n_total, k):
    return (H - k + 1) / (n_total - k) if n_total > k else None

def safe_float(x):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return round(x, 5) if isinstance(x, float) else x

def format_posthoc_simple(posthoc_res, valid):
    """
    Normalize posthoc results into a flat dict of comparisons:
    "Log i vs Log j": { "p_value": ..., "test": "Dunn"/"Tukey", "significant": True/False }
    Accepts:
      - pandas.DataFrame (from scikit_posthocs)
      - dict-of-dicts (from DataFrame.to_dict())
      - custom dict produced from Tukey summary
    Returns None if no posthoc_res.
    """
    if posthoc_res is None:
        return None

    k = len(valid)
    if k < 2:
        return None

    result = {}

    # Helper to push pair
    def push(i, j, p, test_name):
        key = f"Log {i+1} vs Log {j+1}"
        result[key] = {
            "p_value": round(float(p), 5) if p is not None else None,
            "test": test_name,
            "significant": (float(p) < 0.05) if (p is not None) else None
        }

    # Case: pandas DataFrame (scikit-posthocs)
    if isinstance(posthoc_res, pd.DataFrame):
        df = posthoc_res
        for i in range(k):
            for j in range(i + 1, k):
                try:
                    p = df.iloc[i, j]
                except Exception:
                    try:
                        p = df.iloc[j, i]
                    except Exception:
                        p = None
                push(i, j, p, "Dunn")
        return result

    # Case: dict-of-dicts (DataFrame.to_dict())
    if isinstance(posthoc_res, dict):
        # keys might be ints or strings; normalize access
        for i in range(k):
            for j in range(i + 1, k):
                p = None
                # try column j then i
                for key_j in (j, str(j)):
                    col = posthoc_res.get(key_j)
                    if isinstance(col, dict):
                        for key_i in (i, str(i)):
                            if key_i in col:
                                p = col[key_i]
                                break
                    if p is not None:
                        break
                # fallback: try reverse orientation
                if p is None:
                    for key_i in (i, str(i)):
                        col = posthoc_res.get(key_i)
                        if isinstance(col, dict):
                            for key_j in (j, str(j)):
                                if key_j in col:
                                    p = col[key_j]
                                    break
                        if p is not None:
                            break
                push(i, j, p, "Dunn")
        return result

    # Otherwise, if it's some other mapping/list handle gracefully (try iteration)
    try:
        # assume posthoc_res is iterable of ((i,j), p)
        for item in posthoc_res:
            # can't reliably parse — skip
            pass
    except Exception:
        pass

    return None



# ---------------- Convert DFGs to JSON with guaranteed start/end ----------------
def dfg_to_json_with_nodes(dfg, log=None):
    edges = []
    nodes_set = set()
    for (s, t), f in dfg.items():
        edges.append({"from": s, "to": t, "freq": f})
        nodes_set.add(s)
        nodes_set.add(t)

    # Standard DFG start/end
    start_nodes = [n for n in nodes_set if n not in {t for (_, t) in dfg.keys()}]
    end_nodes = [n for n in nodes_set if n not in {s for (s, _) in dfg.keys()}]

    # fallback: use first/last event in traces if empty
    if log and not start_nodes:
        start_nodes = list({trace[0]["concept:name"] for trace in log if len(trace) > 0})
    if log and not end_nodes:
        end_nodes = list({trace[-1]["concept:name"] for trace in log if len(trace) > 0})

    return {"edges": edges, "start_nodes": start_nodes, "end_nodes": end_nodes}

# ---------------- POST ----------------
@app.post("/dfg_multi")
async def dfg_multi(
    files: list[UploadFile] = File(...),
    selected_variants_raw: str = Form(default=None)
):
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")
        


        logs, names, dfs = [], [], []

        for file in files:
            df = pd.read_csv(file.file)
            df.rename(columns={"case": "case:concept:name",
                               "activity": "concept:name",
                               "timestamp": "time:timestamp"}, inplace=True)
            for col in ["case:concept:name", "concept:name", "time:timestamp"]:
                if col not in df.columns:
                    raise HTTPException(status_code=400, detail=f"Missing column {col} in {file.filename}")

            df["time:timestamp"] = pd.to_datetime(df["time:timestamp"], errors="coerce")
            if df["time:timestamp"].isna().any():
                raise HTTPException(status_code=400, detail=f"Invalid timestamps in {file.filename}")

            df = df.sort_values(["case:concept:name", "time:timestamp"]).reset_index(drop=True)
            # ---- elapsed time since case start ----
            df["case_start_time"] = df.groupby("case:concept:name")["time:timestamp"].transform("min")
            df["elapsed_time"] = (
                df["time:timestamp"] - df["case_start_time"]
            ).dt.total_seconds()

            dfs.append(df.copy())
            logs.append(log_converter.apply(df, variant=log_converter.Variants.TO_EVENT_LOG))
            names.append(file.filename)

# ----------------- Optimized Variant Extraction -----------------
            all_variants, trace_keys_all = [], []

            for df in dfs:
                # Add previous activity (keep your original)
                df['prev_act'] = df.groupby('case:concept:name')['concept:name'].shift(1).fillna('start')

                # Extract sequences per case
                sequences = df.groupby('case:concept:name')['concept:name'].agg(list).tolist()
                trace_keys_all.extend(tuple(seq) for seq in sequences)

            # Use set to speed up duplicate checking
            seen_sequences = set()
            for seq in trace_keys_all:
                if seq not in seen_sequences:
                    all_variants.append({"sequence": seq, "key": "|".join(seq)})
                    seen_sequences.add(seq)


        # Filter variants if needed
        if selected_variants_raw:
            selected_keys = selected_variants_raw.split(",")
            filtered_logs = []
            for log in logs:
                f_log = [trace for trace in log if "|".join(event["concept:name"] for event in trace) in selected_keys]
                filtered_logs.append(f_log)
            logs = filtered_logs

        # Discover DFGs
        dfgs = []
        for log in logs:
            try:
                result = dfg_discovery.apply(log)
                dfgs.append(result[0] if isinstance(result, tuple) else result)
            except:
                dfgs.append({})

        # Collect nodes
        nodes = set()
        for d in dfgs:
            for s, t in d.keys():
                nodes.add(s)
                nodes.add(t)
        nodes = list(nodes)

        # Node frequency per log
        freq_dict = {}
        for node in nodes:
            per_log_lists = [
                df.groupby('case:concept:name')['concept:name']
                .apply(lambda x: int((x == node).sum()))  #  int
                .tolist()
                for df in dfs
            ]
            #avoid numpy type issues
            per_log_lists = [list(map(int, l)) for l in per_log_lists]
            freq_dict[node] = per_log_lists
            
        # ---------------- Elapsed Time per Node ----------------
        elapsed_dict = {}

        for node in nodes:
            per_log_lists = []
            for df in dfs:
                times = (
                    df[df["concept:name"] == node]
                    .groupby("case:concept:name")["elapsed_time"]
                    .mean()   # choose mean / median / min
                    .tolist()
                    )
                per_log_lists.append(times)

            elapsed_dict[node] = per_log_lists

        # ---------------- Node Statistical Tests for elapsed time ----------------
        def compute_node_stats(per_node_dict):
            stats_result = {}
            alpha, min_total_count = 0.05, 3

            for node, lists_per_log in per_node_dict.items():
                valid = [lst for lst in lists_per_log if len(lst) > 0]
                k = len(valid)

                if k < 2:
                    stats_result[node] = {
                        "stat": None,
                        "p_value": 1,
                        "effect_size": None,
                        "test": None,
                        "posthoc": None
                    }
                    continue

                n_total = sum(len(lst) for lst in valid)
                all_vals = [v for lst in valid for v in lst]
                normal = len(all_vals) >= 8 and shapiro(all_vals)[1] > 0.05

                stat, p, effect_size = None, None, None
                posthoc_res = None
                test_name = None

                if k == 2:
                    if normal:
                        stat, p = ttest_ind(*valid, equal_var=False)
                        effect_size = eta_squared_anova(stat, 1, n_total - 2)
                        test_name = "t-test"
                    else:
                        try:
                            stat, p = kruskal(*valid)
                            effect_size = epsilon_squared_kruskal(stat, n_total, k) if stat is not None else 0.0
                            test_name = "Kruskal-Wallis"
                            try:
                                df_post = sp.posthoc_dunn(valid, p_adjust="bonferroni")
                                posthoc_res = df_post if isinstance(df_post, pd.DataFrame) else df_post.to_dict()
                            except Exception as e:
                                print(f"Posthoc failed for edge/node {node}: {e}")
                                posthoc_res = None
                        except Exception as e:
                            # 这里捕获 "All numbers are identical" 等退化情况
                            print(f"Kruskal failed for {node} (degenerate case): {e}")
                            stat, p = None, 1.0
                            effect_size = 0.0
                            test_name = "Kruskal-Wallis (no variation)"
                            posthoc_res = None
                else:
                    if normal:
                        stat, p = f_oneway(*valid)
                        effect_size = eta_squared_anova(stat, k - 1, n_total - k)
                        test_name = "ANOVA"
                        try:
                            all_vals_flat, group_labels = [], []
                            for i, lst in enumerate(valid):
                                all_vals_flat.extend(lst)
                                group_labels.extend([i] * len(lst))
                            tukey = pairwise_tukeyhsd(all_vals_flat, group_labels, alpha=0.05)
                            tukey_rows = tukey.summary().data[1:]
                            tukey_dict = {}
                            for row in tukey_rows:
                                g1, g2, pval = int(row[0]), int(row[1]), float(row[3])
                                tukey_dict.setdefault(g2, {})[g1] = pval
                            posthoc_res = tukey_dict
                        except Exception:
                            posthoc_res = None
                    else:
                        stat, p = kruskal(*valid)
                        effect_size = epsilon_squared_kruskal(stat, n_total, k)
                        test_name = "Kruskal-Wallis"
                        try:
                            df_post = sp.posthoc_dunn(valid, p_adjust="bonferroni")
                            posthoc_res = df_post if isinstance(df_post, pd.DataFrame) else df_post.to_dict()
                        except Exception:
                            posthoc_res = None

                stats_result[node] = {
                    "stat": safe_float(stat),
                    "p_value": safe_float(p),
                    "effect_size": safe_float(effect_size),
                    "test": test_name,
                    "posthoc": format_posthoc_simple(posthoc_res, valid)
                }

            return stats_result

        # Node Statistical Tests for Frequencies
        stats_result = {}
        alpha, min_total_count = 0.05, 3

        for node, lists_per_log in freq_dict.items():
            valid = [lst for lst in lists_per_log if len(lst) > 0]
            k = len(valid)
            if k < 2:
                stats_result[node] = {"stat": None, "p_value": 1, "effect_size": None, "test": None, "posthoc": None}
                continue

            n_total = sum(len(lst) for lst in valid)
            all_vals = [v for lst in valid for v in lst]
            normal = len(all_vals) >= 8 and shapiro(all_vals)[1] > 0.05

            posthoc_res = None
            test_name = None

            if k == 2:
                if normal:
                    stat, p = ttest_ind(*valid, equal_var=False)
                    effect_size = eta_squared_anova(stat, 1, n_total - 2)
                    test_name = "t-test"
                    # no posthoc for 2-group t-test (not meaningful)
                    posthoc_res = None
                else:
                    stat, p = kruskal(*valid)
                    effect_size = epsilon_squared_kruskal(stat, n_total, k)
                    test_name = "Kruskal-Wallis"
                    try:
                        # scikit_posthocs expects a list of arrays; returns DataFrame
                        df_post = sp.posthoc_dunn(valid, p_adjust='bonferroni')
                        # ensure DataFrame
                        if isinstance(df_post, pd.DataFrame):
                            posthoc_res = df_post
                        else:
                            posthoc_res = df_post.to_dict() if hasattr(df_post, "to_dict") else None
                    except Exception:
                        posthoc_res = None
            else:
                if normal:
                    stat, p = f_oneway(*valid)
                    effect_size = eta_squared_anova(stat, k - 1, n_total - k)
                    test_name = "ANOVA"
                    # compute Tukey HSD post-hoc
                    try:
                        all_vals_flat, group_labels = [], []
                        for idx_g, lst in enumerate(valid):
                            all_vals_flat.extend(lst)
                            group_labels.extend([idx_g] * len(lst))
                        tukey = pairwise_tukeyhsd(endog=all_vals_flat, groups=group_labels, alpha=0.05)
                        # parse tukey summary table
                        tukey_rows = tukey.summary().data[1:]
                        # build dict in same orientation as Dunn .to_dict() usage: posthoc_res[j][i] = p
                        tukey_dict = {}
                        for row in tukey_rows:
                            # row: [group1, group2, meandiff, p-adj, lower, upper, reject]
                            try:
                                g1 = int(str(row[0]))
                                g2 = int(str(row[1]))
                                pval = float(row[3])
                            except Exception:
                                # if group names are not ints, try to map by index via order (fallback)
                                continue
                            tukey_dict.setdefault(g2, {})[g1] = pval
                        posthoc_res = tukey_dict
                    except Exception:
                        posthoc_res = None
                else:
                    stat, p = kruskal(*valid)
                    effect_size = epsilon_squared_kruskal(stat, n_total, k)
                    test_name = "Kruskal-Wallis"
                    try:
                        df_post = sp.posthoc_dunn(valid, p_adjust='bonferroni')
                        if isinstance(df_post, pd.DataFrame):
                            posthoc_res = df_post
                        else:
                            posthoc_res = df_post.to_dict() if hasattr(df_post, "to_dict") else None
                    except Exception:
                        posthoc_res = None

            stats_result[node] = {
                "stat": safe_float(stat),
                "p_value": safe_float(p),
                "effect_size": safe_float(effect_size),
                "test": test_name,
                "posthoc": format_posthoc_simple(posthoc_res, valid)
            }

        stats_elapsed = compute_node_stats(elapsed_dict)
        # Merge DFGs
        merged_dfg = {}
        for d in dfgs:
            for edge, freq in d.items():
                merged_dfg[edge] = merged_dfg.get(edge, 0) + freq

        sig_nodes = {
            n for n, r in stats_result.items()
            if r["p_value"] < alpha and sum(df['concept:name'].eq(n).sum() for df in dfs) >= min_total_count
        }
        merged_dfg_significant = {e: f for e, f in merged_dfg.items() if e[0] in sig_nodes or e[1] in sig_nodes}

         # ---------------- Edge Statistical Tests ----------------
        edge_time_dict = {}
        for edge in merged_dfg.keys():
            src, tgt = edge
            per_log_lists = []
            for df_idx, df in enumerate(dfs):
                transition_times = []
                for case, group in df.groupby("case:concept:name"):
                    group = group.sort_values("time:timestamp").reset_index(drop=True)
                    elapsed = group["elapsed_time"].values
                    activities = group["concept:name"].values

                    for i in range(len(activities) - 1):
                        if activities[i] == src and activities[i+1] == tgt:
                            time_diff = elapsed[i+1] - elapsed[i]
                            if time_diff >= 0:
                                transition_times.append(time_diff)
                
                per_log_lists.append(transition_times)
                
                # 控制台打印，看数据合不合理
                if transition_times:
                    print(f"Edge {src} → {tgt} | Log {names[df_idx]} "
                          f"| Transitions: {len(transition_times)} "
                          f"| Mean: {np.mean(transition_times):.2f}s "
                          f"| Median: {np.median(transition_times):.2f}s "
                          f"| Min: {np.min(transition_times):.2f}s "
                          f"| Max: {np.max(transition_times):.2f}s")
                else:
                    print(f"Edge {src} → {tgt} | Log {names[df_idx]} | No transitions found")

            edge_time_dict[f"{src}->{tgt}"] = per_log_lists

        # 统计检验
        stats_edge_time = compute_node_stats(edge_time_dict)

        # 打印统计概览
        print("\n=== Edge Transition Time Statistics ===")
        for edge_key, stat in stats_edge_time.items():
            sig = "Yes" if stat["p_value"] is not None and stat["p_value"] < 0.05 else "No"
            print(f"{edge_key}: p={stat['p_value']}, test={stat['test']}, effect_size={stat['effect_size']}, significant={sig}")
        edge_stats_result = {}
        for edge in merged_dfg.keys():
            src, tgt = edge
            # Gather per-log counts for this edge
            per_log_lists = []
            for df in dfs:
                # count occurrences where src->tgt appears consecutively in the same case
                counts = []
                for case, group in df.groupby("case:concept:name"):
                    events = list(group["concept:name"])
                    cnt = sum(1 for i in range(len(events)-1) if events[i]==src and events[i+1]==tgt)
                    counts.append(cnt)
                per_log_lists.append(counts)

            # valid logs (at least 1 entry)
            valid = [lst for lst in per_log_lists if len(lst) > 0]
            k = len(valid)
            if k < 2:
                edge_stats_result[f"{src}->{tgt}"] = {"test": None, "stat": None, "p_value": None, "effect_size": None}
                continue

            n_total = sum(len(lst) for lst in valid)
            all_vals = [v for lst in valid for v in lst]
            normal = len(all_vals) >= 8 and shapiro(all_vals)[1] > 0.05

            stat, p, effect_size = None, None, None

            if k == 2:
                if normal:
                    stat, p = ttest_ind(*valid, equal_var=False)
                    effect_size = eta_squared_anova(stat, 1, n_total-2)
                    test_name = "t-test"
                else:
                    stat, p = kruskal(*valid)
                    effect_size = epsilon_squared_kruskal(stat, n_total, k)
                    test_name = "Kruskal-Wallis"
            else:
                if normal:
                    stat, p = f_oneway(*valid)
                    effect_size = eta_squared_anova(stat, k-1, n_total-k)
                    test_name = "ANOVA"
                else:
                    stat, p = kruskal(*valid)
                    effect_size = epsilon_squared_kruskal(stat, n_total, k)
                    test_name = "Kruskal-Wallis"

            edge_stats_result[f"{src}->{tgt}"] = {
                "test": test_name,
                "stat": safe_float(stat),
                "p_value": safe_float(p),
                "effect_size": safe_float(effect_size)
        }

        # Convert DFGs to JSON with guaranteed start/end
        dfgs_json = []
        dfgs_start_nodes = []
        dfgs_end_nodes = []
        for idx, d in enumerate(dfgs):
            res = dfg_to_json_with_nodes(d, logs[idx])
            dfgs_json.append(res["edges"])
            dfgs_start_nodes.append(res["start_nodes"])
            dfgs_end_nodes.append(res["end_nodes"])

        merged_dfg_json = [{"from": s, "to": t, "freq": f} for (s, t), f in merged_dfg.items()]
        merged_res = dfg_to_json_with_nodes(merged_dfg, [trace for log in logs for trace in log])
        merged_dfg_start_nodes = merged_res["start_nodes"]
        merged_dfg_end_nodes = merged_res["end_nodes"]
        merged_dfg_significant_json = [{"from": s, "to": t, "freq": f} for (s, t), f in merged_dfg_significant.items()]

        # Variants counts (kept as original)
        for v in all_variants:
            seq = v["sequence"]
            v["total"] = sum(1 for s in trace_keys_all if s == seq)
            v["counts_per_log"] = [sum(1 for trace in log if tuple(e["concept:name"] for e in trace) == seq) for log in logs]
            v["present"] = [c > 0 for c in v["counts_per_log"]]

        return {
            "nodes": nodes,
            "node_freq": freq_dict,
            "dfgs": dfgs_json,
            "dfgs_start_nodes": dfgs_start_nodes,
            "dfgs_end_nodes": dfgs_end_nodes,
            "stats": stats_result,
            "stats_elapsed": stats_elapsed,
            "edge_stats": edge_stats_result,
            "stats_edge_time": stats_edge_time,        # ← 新增：统计结果（p值、显著性等）
            "edge_time_data": edge_time_dict,          # ← 新增：原始转移时间列表（用于箱线图、平均值等）
            "log_names": names,
            "merged_dfg": merged_dfg_json,
            "merged_dfg_start_nodes": merged_dfg_start_nodes,
            "merged_dfg_end_nodes": merged_dfg_end_nodes,
            "merged_dfg_significant": merged_dfg_significant_json,
            "alpha": alpha,
            "variants": all_variants
        }

    except Exception as e:
        print("Exception in /dfg_multi", e)
        raise HTTPException(status_code=500, detail=str(e))





