# scripts/gen-emission.py  —  run locally with SpekPy in the active env.
# Tungsten TOTAL emission (bremsstrahlung + characteristic lines), by tube voltage,
# at the ideal reference geometry (20 deg anode, no filtration). Committed; browser/CI never run this.
import json, datetime, numpy as np, spekpy as sp

ANODE_ANGLE = 20
EMAX = 300
KVP_GRID = list(range(20, 301, 10))
SRC_DK = 0.5
INT_E = np.arange(0, EMAX + 1)

def emission_row(kvp):
    # char=True -> brem + characteristic lines (total emission leaving the anode)
    s = sp.Spek(kvp=kvp, th=ANODE_ANGLE, dk=SRC_DK, physics="casim", char=True)
    k, f = s.get_spectrum(edges=False)
    # Integral rebinning: sum fine 0.5 keV bins into integer bins (conserves count, no comb,
    # characteristic lines land in their integer bin).
    row = np.zeros(EMAX + 1)
    for e, fl in zip(k, f):
        i = int(np.floor(e + 0.5))
        if 0 <= i <= EMAX and e <= kvp + 1e-9:
            row[i] += fl
    return [float(f"{v:.6g}") if v > 0 else 0.0 for v in row]

data = {
    "meta": {
        "title": "Tungsten total emission (brem + characteristic), by tube voltage, no filtration",
        "source": "Generated with SpekPy 2.5.4, physics=casim, char=True, 20deg anode",
        "generated": datetime.date.today().isoformat(),
    },
    "anode": "W", "anodeAngleDeg": ANODE_ANGLE, "physics": "casim", "charIncluded": True,
    "energyStepKeV": 1.0, "energyMaxKeV": EMAX, "kvpGrid": KVP_GRID,
    "fluence": {str(kv): emission_row(kv) for kv in KVP_GRID},
}
with open("src/data/xray-emission-W.json", "w", encoding="utf-8") as fh:
    json.dump(data, fh, separators=(",", ":"))
print("wrote src/data/xray-emission-W.json", len(KVP_GRID), "kVp rows")
