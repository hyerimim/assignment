async function loadCatFact() {
  try {
    const res = await fetch("https://catfact.ninja/fact");
    const data = await res.json();

    document.querySelector(".fact").textContent = data.fact;
  } catch (error) {
    document.querySelector(".fact").textContent = "Failed to load cat fact.";
  }
}

document.getElementById("newFact").addEventListener("click", loadCatFact);
loadCatFact();
