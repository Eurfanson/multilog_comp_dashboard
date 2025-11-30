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
    Convert posthoc result (dict from Dunn/Tukey) to a readable flat dict:
    "Log 1 vs Log 2": { "p_value": 0.123, "test": "Dunn", "significant": True }
    """
    if not isinstance(posthoc_res, dict):
        return {}

    k = len(valid)
    result = {}
    for i in range(k):
        for j in range(i + 1, k):
            log_i = f"Log {i+1}"
            log_j = f"Log {j+1}"
            p_val = posthoc_res.get(j, {}).get(i, None)
            if p_val is not None:
                result[f"{log_i} vs {log_j}"] = {
                    "p_value": round(p_val, 5),
                    "test": "Dunn",
                    "significant": p_val < 0.05
                }
            else:
                result[f"{log_i} vs {log_j}"] = {"p_value": None, "test": "Dunn", "significant": None}
    return result

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
            dfs.append(df.copy())
            logs.append(log_converter.apply(df, variant=log_converter.Variants.TO_EVENT_LOG))
            names.append(file.filename)

        # Extract variants
        all_variants, trace_keys_all = [], []
        for df in dfs:
            df['prev_act'] = df.groupby('case:concept:name')['concept:name'].shift(1).fillna('start')
            for seq in df.groupby('case:concept:name')['concept:name'].agg(list):
                seq_tuple = tuple(seq)
                trace_keys_all.append(seq_tuple)
                if seq_tuple not in [v["sequence"] for v in all_variants]:
                    all_variants.append({"sequence": seq_tuple, "key": "|".join(seq_tuple)})

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
            per_log_lists = [df.groupby('case:concept:name')['concept:name'].apply(lambda x: (x == node).sum()).tolist() for df in dfs]
            freq_dict[node] = per_log_lists

        # Statistical Tests
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

            if k == 2:
                if normal:
                    stat, p = ttest_ind(*valid, equal_var=False)
                    effect_size = eta_squared_anova(stat, 1, n_total - 2)
                    test_name = "t-test"
                else:
                    stat, p = kruskal(*valid)
                    effect_size = epsilon_squared_kruskal(stat, n_total, k)
                    test_name = "Kruskal-Wallis"
                    try:
                        posthoc_res = sp.posthoc_dunn(valid, p_adjust='bonferroni').to_dict()
                    except:
                        posthoc_res = None
            else:
                if normal:
                    stat, p = f_oneway(*valid)
                    effect_size = eta_squared_anova(stat, k - 1, n_total - k)
                    test_name = "ANOVA"
                    try:
                        all_vals_flat, group_labels = [], []
                        for idx, lst in enumerate(valid):
                            all_vals_flat.extend(lst)
                            group_labels.extend([idx]*len(lst))
                        tukey = pairwise_tukeyhsd(endog=all_vals_flat, groups=group_labels, alpha=0.05)
                        # Tukey can be processed into simple dict if needed
                        posthoc_res = None
                    except:
                        posthoc_res = None
                else:
                    stat, p = kruskal(*valid)
                    effect_size = epsilon_squared_kruskal(stat, n_total, k)
                    test_name = "Kruskal-Wallis"
                    try:
                        posthoc_res = sp.posthoc_dunn(valid, p_adjust='bonferroni').to_dict()
                    except:
                        posthoc_res = None

            stats_result[node] = {
                "stat": safe_float(stat),
                "p_value": safe_float(p),
                "effect_size": safe_float(effect_size),
                "test": test_name,
                "posthoc": format_posthoc_simple(posthoc_res, valid)
            }

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

        # Convert DFGs to JSON
        dfgs_json = [[{"from": s, "to": t, "freq": f} for (s, t), f in d.items()] for d in dfgs]
        merged_dfg_json = [{"from": s, "to": t, "freq": f} for (s, t), f in merged_dfg.items()]
        merged_dfg_significant_json = [{"from": s, "to": t, "freq": f} for (s, t), f in merged_dfg_significant.items()]

        # Variants counts
        for v in all_variants:
            seq = v["sequence"]
            v["total"] = sum(1 for s in trace_keys_all if s == seq)
            v["counts_per_log"] = [sum(1 for trace in log if tuple(e["concept:name"] for e in trace) == seq) for log in logs]
            v["present"] = [c > 0 for c in v["counts_per_log"]]

        return {
            "nodes": nodes,
            "dfgs": dfgs_json,
            "stats": stats_result,
            "log_names": names,
            "merged_dfg": merged_dfg_json,
            "merged_dfg_significant": merged_dfg_significant_json,
            "alpha": alpha,
            "variants": all_variants
        }

    except Exception as e:
        print("Exception in /dfg_multi", e)
        raise HTTPException(status_code=500, detail=str(e))


"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pm4py.objects.conversion.log import converter as log_converter
from pm4py.algo.discovery.dfg import algorithm as dfg_discovery

app = FastAPI()

# Allow frontend requests (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ----------------------
# Ping endpoint to check server
# ----------------------
@app.get("/ping")
def ping():
    return {"message": "pong"}

# ----------------------
# Test CSV upload endpoint
# ----------------------
@app.post("/upload_test")
async def upload_test(file: UploadFile = File(...)):
    try:
        df = pd.read_csv(file.file)
        return {"preview": df.head().to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {e}")

# ----------------------
# DFG generation endpoint (returns JSON)
# ----------------------
@app.post("/dfg_json")
async def dfg_json(file: UploadFile = File(...)):
    try:
        df = pd.read_csv(file.file)
        df['time:timestamp'] = pd.to_datetime(df['time:timestamp'])
        event_log = log_converter.apply(df, variant=log_converter.Variants.TO_EVENT_LOG)

        # Compute DFG
        dfg_result = dfg_discovery.apply(event_log)
        dfg = dfg_result[0] if isinstance(dfg_result, tuple) else dfg_result

        edges = []
        nodes = set()
        for key, value in dfg.items():
            try:
                src, tgt = key
                edges.append({"source": src, "target": tgt, "frequency": int(value)})
                nodes.update([src, tgt])
            except Exception:
                continue

        return {"nodes": list(nodes), "edges": edges}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating DFG: {e}")
"""

