document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector('.form-data');
  const region = document.querySelector('.region-name');
  const apiKey = document.querySelector('.api-key');

  const errors = document.querySelector('.errors');
  const loading = document.querySelector('.loading');
  const results = document.querySelector('.result-container');

  const usage = document.querySelector('.carbon-usage');
  const fossilfuel = document.querySelector('.fossil-fuel');
  const myregion = document.querySelector('.my-region');

  const clearBtn = document.querySelector('.clear-btn');

  form.addEventListener('submit', (e) => handleSubmit(e));
  clearBtn.addEventListener('click', (e) => reset(e));

  init();

  function init() {
    const storedApiKey = localStorage.getItem('apiKey');
    const storedRegion = localStorage.getItem('regionName');

    if (!storedApiKey || !storedRegion) {
      form.style.display = 'block';
      results.style.display = 'none';
      loading.style.display = 'none';
      clearBtn.style.display = 'none';
      errors.textContent = '';
    } else {
      form.style.display = 'none';
      clearBtn.style.display = 'block';
      displayCarbonUsage(storedApiKey, storedRegion);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    loading.style.display = 'block';
    form.style.display = 'none';

    const regionValue = region.value.trim();
    const apiKeyValue = apiKey.value.trim();

    localStorage.setItem('regionName', regionValue);
    localStorage.setItem('apiKey', apiKeyValue);

    displayCarbonUsage(apiKeyValue, regionValue);
  }

  function reset(e) {
    e.preventDefault();
    localStorage.removeItem('regionName');
    localStorage.removeItem('apiKey');
    init();
  }

  async function displayCarbonUsage(apiKeyValue, regionName) {
    loading.style.display = 'block';
    errors.textContent = '';
    results.style.display = 'none';

    myregion.textContent = regionName;

    try {
      const res = await fetch(
        `https://api.electricitymaps.com/v3/carbon-intensity/latest?zone=${regionName}`,
        {
          headers: {
            "auth-token": apiKeyValue
          }
        }
      );

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      const carbon = Math.round(data.carbonIntensity);
      const fossil = data.fossilFuelPercentage
        ? data.fossilFuelPercentage.toFixed(2)
        : "N/A";

      usage.textContent = `${carbon} grams (grams CO₂ emitted per kilowatt hour)`;
      fossilfuel.textContent = `${fossil}%`;

      calculateColor(carbon);

      loading.style.display = 'none';
      results.style.display = 'block';

    } catch (err) {
      console.log(err);
      errors.textContent = 'Sorry, failed to load data';
      loading.style.display = 'none';
    }
  }

  function calculateColor(value) {
    let co2Scale = [0, 150, 600, 750, 800];
    let colors = ['#2AA364', '#F5EB4D', '#9E4229', '#381D02', '#381D02'];

    let closestNum = co2Scale.sort((a, b) => {
      return Math.abs(a - value) - Math.abs(b - value);
    })[0];

    let num = (element) => element > closestNum;
    let scaleIndex = co2Scale.findIndex(num);

    let closestColor = colors[scaleIndex];

    chrome.runtime.sendMessage({
      action: 'updateIcon',
      value: { color: closestColor }
    });
  }

});