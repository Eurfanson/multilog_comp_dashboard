# small test change

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
            col_map = {"case": "case:concept:name", "activity": "concept:name", "timestamp": "time:timestamp"}
            df.rename(columns=col_map, inplace=True)
            for col in ["case:concept:name", "concept:name", "time:timestamp"]:
                if col not in df.columns:
                    raise HTTPException(status_code=400, detail=f"Missing column {col} in {file.filename}")
            df['time:timestamp'] = pd.to_datetime(df['time:timestamp'], errors='coerce')
            if df['time:timestamp'].isna().any():
                raise HTTPException(status_code=400, detail=f"Invalid timestamps in {file.filename}")
            logs.append(log_converter.apply(df, variant=log_converter.Variants.TO_EVENT_LOG))
            names.append(file.filename)
        '''Wang '''
        
        
        #Wang
        # Statistical tests per node
        stats_result = {}
        for node, counts_per_log in freq_dict.items():
            valid_lists = [lst for lst in counts_per_log if len(lst) > 0 and len(set(lst)) > 1]
            if len(valid_lists) < 2:
                stats_result[node] = {"stat": None, "p_value": 1, "effect_size": None, "test": None, "posthoc": None}
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
                        "group": sum([[i]*len(lst) for i, lst in enumerate(valid_lists)], [])
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
                        dunn = sp.posthoc_dunn([lst for lst in valid_lists], p_adjust="bonferroni")
                        posthoc_res = dunn.to_dict()
            except:
                posthoc_res = None

            stats_result[node] = {
                "stat": stat,
                "p_value": p,
                "effect_size": eta2,
                "test": test_name,
                "posthoc": posthoc_res
            }
        #Wang
            
       
        
    #wang
    except Exception as e:
        print("Exception in /dfg_multi:", e)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing logs: {e}")
    #wang




