import pandas as pd
import numpy as np

def generate_event_log(filename, num_cases=20, events_per_case=5, activity_bias=None, time_range=(0, 10000)):
    np.random.seed(None)  # different seed each run
    activities = ["Approve Request", "Quality Check", "Submit Request", 
                  "Reject Request",  "Notify Completion"]
    
    cases = ["Case" + str(i+1) for i in range(num_cases)]
    data = []

    # Default: uniform if not given
    if activity_bias is None:
        activity_bias = {a: 1/len(activities) for a in activities}

    # Normalize the probabilities to ensure they sum to 1
    total = sum(activity_bias.values())

    if total == 0:
        raise ValueError("The total probability sum cannot be zero.")

    # Normalize if necessary and ensure that probabilities sum exactly to 1
    activity_prob = [activity_bias.get(a, 0) / total for a in activities]

    # Check for any zero probabilities and assign a minimal value to avoid issues with np.random.choice
    if any(p == 0 for p in activity_prob):
        print("Warning: Some probabilities are zero. Adjusting to a small value.")
        min_prob = 1e-6  # minimal probability to avoid zero
        activity_prob = [p if p > 0 else min_prob for p in activity_prob]
        total_prob = sum(activity_prob)
        activity_prob = [p / total_prob for p in activity_prob]  # Re-normalize

    # Ensure the probabilities sum exactly to 1
    if abs(sum(activity_prob) - 1) > 1e-6:
        print(f"Warning: Probabilities were normalized. Total sum: {sum(activity_prob)}")

    # Debugging: Print the normalized probabilities
    print(f"Normalized probabilities: {activity_prob}")

    for case in cases:
        for _ in range(events_per_case):
            data.append({
                "case": case,
                "activity": np.random.choice(activities, p=activity_prob),
                "timestamp": pd.Timestamp("2025-11-04") + pd.Timedelta(np.random.randint(*time_range), unit="m")
            })
    
    df = pd.DataFrame(data)
    df.to_csv(filename, index=False)
    print(f"{filename} generated!")

# Log 1: mostly "Process Request" and "Rework Request" (orange/yellow)
generate_event_log("event_log1.csv", activity_bias={
    "Process Request": 0.4, "Rework Request": 0.3, "Quality Check": 0.15,
    "Submit Request": 0.1, "Manager Review": 0.05
}, time_range=(0, 5000))

# Log 2: mostly "Approve Request" and "Submit Request" (green/blue)
generate_event_log("event_log2.csv", activity_bias={
    "Approve Request": 0.4, "Submit Request": 0.3, "Notify Completion": 0.15,
    "Quality Check": 0.1, "Manager Review": 0.05
}, time_range=(3000, 8000))

# Log 3: mostly "Reject Request" and "Manager Review" (red/orange)
generate_event_log("event_log3.csv", activity_bias={
    "Reject Request": 0.4, "Manager Review": 0.3, "Rework Request": 0.15,
    "Process Request": 0.1, "Submit Request": 0.05
}, time_range=(5000, 10000))
