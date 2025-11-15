'''wang:connect backend API and import libraries''' 
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pm4py.objects.conversion.log import converter as log_converter
from pm4py.algo.discovery.dfg import algorithm as dfg_discovery
from scipy.stats import shapiro, kruskal, f_oneway, ttest_ind
import numpy as np
import itertools
import scikit_posthocs as sp  # pip install scikit-posthocs


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
'''Wang '''

'''Wang: post-hoc effect size'''
def effect_size_eta_squared(stat, n_total):
    return stat / (n_total - 1) if n_total > 1 else None
'''Wang'''

'''wang + dimo'''
@app.post("/dfg_multi")
async def dfg_multi(files: list[UploadFile] = File(...)):
    try:
        '''Wang '''
        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")

        logs, names = [], []
        for file in files:
            df = pd.read_csv(file.file)
            col_map = {
                "case": "case:concept:name",
                "activity": "concept:name",
                "timestamp": "time:timestamp",
            }
            df.rename(columns=col_map, inplace=True)
            for col in ["case:concept:name", "concept:name", "time:timestamp"]:
                if col not in df.columns:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Missing column {col} in {file.filename}",
                    )
            df["time:timestamp"] = pd.to_datetime(
                df["time:timestamp"], errors="coerce"
            )
            if df["time:timestamp"].isna().any():
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid timestamps in {file.filename}",
                )
            logs.append(
                log_converter.apply(df, variant=log_converter.Variants.TO_EVENT_LOG)
            )
            names.append(file.filename)
        '''Wang '''
        
        '''dimo: dfg generation for event logs'''
        # Compute DFGs per log
        dfgs = []
        for log in logs:
            try:
                dfg_result = dfg_discovery.apply(log)
                dfgs.append(dfg_result[0] if isinstance(dfg_result, tuple) else dfg_result)
            except:
                dfgs.append({})

        # Collect all nodes
        nodes_set = set()
        for d in dfgs:
            for (s, t) in d.keys():
                nodes_set.update([s, t])
        nodes = list(nodes_set)

        # Build per-node counts per log
        freq_dict = {}
        for node in nodes:
            per_log_counts = []
            for log in logs:
                counts = [sum(1 for event in trace if event["concept:name"] == node) for trace in log]
                per_log_counts.append(counts)
            freq_dict[node] = per_log_counts
        '''dimo: dfg generation for event logs'''
        
        
        '''Wang'''
        # Statistical tests per node
        stats_result = {}
        for node, counts_per_log in freq_dict.items():
            valid_lists = [lst for lst in counts_per_log if len(lst) > 0 and len(set(lst)) > 1]
            if len(valid_lists) < 2:
                stats_result[node] = {
                    "stat": None,
                    "p_value": 1,
                    "effect_size": None,
                    "test": None,
                    "posthoc": None,
                }
                continue

            # Normality check
            normal = all(len(lst) > 3 and shapiro(lst)[1] > 0.05 for lst in valid_lists)

            # Select test
            if len(valid_lists) == 2:
                if normal:
                    stat, p = ttest_ind(*valid_lists, equal_var=False)
                    test_name = "t-test (independent)"
                else:
                    stat, p = kruskal(*valid_lists)
                    test_name = "Kruskal-Wallis"
            else:
                if normal:
                    stat, p = f_oneway(*valid_lists)
                    test_name = "One-way ANOVA"
                else:
                    stat, p = kruskal(*valid_lists)
                    test_name = "Kruskal-Wallis"

            n_total = sum(len(lst) for lst in valid_lists)
            eta2 = effect_size_eta_squared(stat, n_total)

            # Post-hoc
            posthoc_res = None
            try:
                if len(valid_lists) > 2:
                    combined = pd.DataFrame({
                        "value": list(itertools.chain(*valid_lists)),
                        "group": sum([[i] * len(lst) for i, lst in enumerate(valid_lists)], []),
                    })
                    if normal:
                        import statsmodels.api as sm
                        from statsmodels.stats.multicomp import pairwise_tukeyhsd

                        tukey = pairwise_tukeyhsd(combined["value"], combined["group"])
                        posthoc_res = {}
                        for row in tukey.summary().data[1:]:
                            g1, g2, meandiff, pval, lower, upper, reject = row
                            posthoc_res[f"{g1}-{g2}"] = pval
                    else:
                        dunn = sp.posthoc_dunn(
                            [lst for lst in valid_lists], p_adjust="bonferroni"
                        )
                        posthoc_res = dunn.to_dict()
            except:
                posthoc_res = None

            stats_result[node] = {
                "stat": stat,
                "p_value": p,
                "effect_size": eta2,
                "test": test_name,
                "posthoc": posthoc_res,
            }
        '''Wang'''
        
        '''Dimo + Wang: merged DFG using statistical test data'''
        # Merge all DFGs (sum frequencies of same edge over all logs)
        merged_dfg = {}
        for d in dfgs:
            for edge, freq in d.items():
                merged_dfg[edge] = merged_dfg.get(edge, 0) + freq

        # Use statistical test data (p-values) to determine significant nodes
        alpha = 0.05  # significance level
        significant_nodes = {
            node
            for node, res in stats_result.items()
            if res.get("p_value") is not None and res.get("p_value") < alpha
        }

        # Keep a merged DFG only for edges touching significant nodes
        merged_dfg_significant = {
            edge: freq
            for edge, freq in merged_dfg.items()
            if edge[0] in significant_nodes or edge[1] in significant_nodes
        }
        '''Dimo + Wang'''
            
        #dimo
        # Convert DFGs to JSON
        dfgs_json = []
        for d in dfgs:
            dfg_list = [
                {"from": s, "to": t, "freq": freq} for (s, t), freq in d.items()
            ]
            dfgs_json.append(dfg_list)

        # Convert merged DFGs to JSON
        merged_dfg_json = [
            {"from": s, "to": t, "freq": freq} for (s, t), freq in merged_dfg.items()
        ]
        merged_dfg_significant_json = [
            {"from": s, "to": t, "freq": freq}
            for (s, t), freq in merged_dfg_significant.items()
        ]

        return {
            "nodes": nodes,
            "dfgs": dfgs_json,
            "stats": stats_result,
            "log_names": names,
            "merged_dfg": merged_dfg_json,
            "merged_dfg_significant": merged_dfg_significant_json,
            "alpha": alpha,
        }
        #dimo 
       
    #wang
    except Exception as e:
        print("Exception in /dfg_multi:", e)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Error processing logs: {e}"
        )
    #wang


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

