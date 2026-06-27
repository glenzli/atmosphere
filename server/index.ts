import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Open-Meteo Geocoding
app.get('/api/geocoding', async (req, res) => {
  let { name } = req.query;
  if (!name) return res.status(400).json({ error: 'City name is required' });
  
  try {
    // Check for non-ASCII characters (like Chinese)
    if (/[^\x00-\x7F]/.test(name as string)) {
      try {
        const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(name as string)}&langpair=zh|en`);
        const transData = await transRes.json();
        if (transData && transData.responseData && transData.responseData.translatedText) {
          name = transData.responseData.translatedText;
        }
      } catch (e) {
        console.warn('Translation failed, falling back to original name', e);
      }
    }

    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name as string)}&count=1&language=en&format=json`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch geocoding data' });
  }
});

// ENSO Status Fetching
app.get('/api/enso', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
    const response = await fetch('https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/detrend.nino34.ascii.txt', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('Failed to fetch ENSO data');
    const text = await response.text();
    
    // Parse the ascii table
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('YR'));
    // Get the latest month
    const latestLine = lines[lines.length - 1];
    const parts = latestLine.split(/\s+/);
    const anomAvg = parseFloat(parts[4] || '0');
    
    let status = 'Neutral';
    if (anomAvg >= 0.5) status = 'El Niño';
    else if (anomAvg <= -0.5) status = 'La Niña';
    
    res.json({ status, value: anomAvg });
  } catch (error) {
    console.error('ENSO fetch failed or timed out', error);
    // Fallback to Neutral if fetch fails
    res.json({ status: 'Neutral', value: 0, error: true });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Server listening on port ${port}`);
});
