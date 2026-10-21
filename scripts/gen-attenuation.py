# scripts/gen-attenuation.py — run locally with SpekPy.
# Mass attenuation coefficients mu/rho [cm^2/g] for filter/HVL materials, plus mass
# energy-absorption mu_en/rho [cm^2/g] for air (for air kerma), over an energy grid that
# spans low-E X-ray through the Co-60 gamma lines (1 .. 1400 keV). SpekPy uses NIST data.
import json, datetime, numpy as np, spekpy as sp

ELEMENTS = {"Be": 4, "Al": 13, "Cu": 29, "Sn": 50, "Ta": 73, "W": 74, "Pb": 82}
# Compositions by (Z, mass fraction) — air (NIST dry air) and water. Computed from element mu/rho.
AIR_COMP = [(6, 0.000124), (7, 0.755267), (8, 0.231781), (18, 0.012827)]
WATER_COMP = [(1, 0.111894), (8, 0.888106)]
DENSITY = {  # g/cm^3 (NIST)
    "Be": 1.848, "Al": 2.699, "Cu": 8.96, "Sn": 7.31, "Ta": 16.654, "W": 19.3, "Pb": 11.35,
    "Air": 0.00120479, "Water": 1.0,
}

# Energy grid: fine where edges live, coarse at high E. keV.
E = np.unique(np.concatenate([
    np.arange(1.0, 150.0 + 1e-6, 0.5),
    np.arange(151.0, 300.0 + 1e-6, 1.0),
    np.arange(310.0, 1400.0 + 1e-6, 10.0),
]))

md = sp.Spek(kvp=150, th=20).mu_data
muen = sp.Spek(kvp=150, th=20).muen_air_data

def sig6(a):
    return [float(f"{float(x):.6g}") for x in np.ravel(a)]

materials = {}
for name, Z in ELEMENTS.items():
    materials[name] = {"Z": Z, "density": DENSITY[name], "mu_over_rho": sig6(md.get_mu_over_rho(Z, E))}
def comp_mor(parts):
    tot = np.zeros_like(E, dtype=float)
    for Z, w in parts:
        tot += w * np.asarray(md.get_mu_over_rho(Z, E)).reshape(-1)
    return tot
materials["Air"] = {"density": DENSITY["Air"], "mu_over_rho": sig6(comp_mor(AIR_COMP))}
materials["Water"] = {"density": DENSITY["Water"], "mu_over_rho": sig6(comp_mor(WATER_COMP))}
# air mu_en/rho for kerma
materials["Air"]["muen_over_rho"] = sig6(muen.get_muen_over_rho_air(E))

data = {
    "meta": {"title": "Mass attenuation (mu/rho) and air mu_en/rho, 1-1400 keV",
             "source": "SpekPy 2.5.4 (NIST data)", "generated": datetime.date.today().isoformat(),
             "units": {"energy": "keV", "mu_over_rho": "cm^2/g", "density": "g/cm^3"}},
    "energyKeV": sig6(E), "materials": materials,
}
with open("src/data/attenuation.json", "w", encoding="utf-8") as fh:
    json.dump(data, fh, separators=(",", ":"))

# verification vs NIST
def at(name, e):
    i = int(np.argmin(np.abs(E - e))); return materials[name]["mu_over_rho"][i]
print("wrote src/data/attenuation.json  energies", len(E))
print("CHECK @100 keV mu/rho  Al", at("Al", 100), "(NIST 0.1704)  Cu", at("Cu", 100),
      "(0.4584)  Pb", at("Pb", 100), "(5.549)  Air", at("Air", 100), "(0.1707)")
ia = int(np.argmin(np.abs(E - 100))); print("air muen/rho @100", materials["Air"]["muen_over_rho"][ia], "(NIST 0.02325)")
