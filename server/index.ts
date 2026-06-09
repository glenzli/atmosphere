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

// Open-Meteo Historical Weather (ERA5)
app.get('/api/weather', async (req, res) => {
  const { lat, lon, startDate, endDate } = req.query;
  if (!lat || !lon || !startDate || !endDate) {
    return res.status(400).json({ error: 'lat, lon, startDate, endDate are required' });
  }

  try {
    // 获取温度、降水、风速，以及用于计算湿球温度的逐小时温湿度
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max&hourly=temperature_2m,relative_humidity_2m&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// WAQI API proxy (If no token is provided, we can fallback to Open-Meteo Air Quality later)
app.get('/api/aqi', async (req, res) => {
  const { lat, lon, token } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat, lon are required' });
  
  if (!token) {
    return res.status(400).json({ error: 'WAQI token is required' });
  }

  try {
    const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AQI data' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
