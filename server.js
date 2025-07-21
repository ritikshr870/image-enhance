const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// Ensure directories exist
const ensureDir = async (dir) => {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
};
ensureDir('public/uploads');
ensureDir('database');

// File storage setup
const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Database functions
async function loadData(file) {
  try {
    const data = await fs.readFile(path.join('database', file), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return file === 'users.json' ? {} : [];
  }
}

async function saveData(file, data) {
  await fs.writeFile(path.join('database', file), JSON.stringify(data, null, 2));
}

function generateCsrfToken() {
  return crypto.randomBytes(16).toString('hex');
}

const validateCsrfToken = async (req, res, next) => {
  const csrfToken = req.headers['csrf-token'];
  if (!csrfToken) return res.status(401).json({ error: 'Unauthorized: No CSRF token' });
  const users = await loadData('users.json');
  if (!Object.values(users).some(u => u.csrfToken === csrfToken)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid CSRF token' });
  }
  next();
};

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = await loadData('users.json');
  if (users[username] && users[username].password === password) {
    const csrfToken = generateCsrfToken();
    users[username].csrfToken = csrfToken;
    await saveData('users.json', users);
    res.json({ csrfToken });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const users = await loadData('users.json');
  if (users[username]) {
    res.status(400).json({ error: 'Username already exists' });
  } else {
    const csrfToken = generateCsrfToken();
    users[username] = { password, csrfToken };
    await saveData('users.json', users);
    res.json({ csrfToken });
  }
});

app.put('/api/profile', validateCsrfToken, async (req, res) => {
  const { username, password } = req.body;
  const csrfToken = req.headers['csrf-token'];
  const users = await loadData('users.json');
  const user = Object.entries(users).find(([_, u]) => u.csrfToken === csrfToken);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const oldUsername = user[0];
  if (username && username !== oldUsername) {
    users[username] = users[oldUsername];
    delete users[oldUsername];
  }
  if (password) users[username || oldUsername].password = password;
  await saveData('users.json', users);
  res.json({ success: true });
});

app.post('/api/enhance', upload.single('image'), validateCsrfToken, async (req, res) => {
  const { type, brightness, saturation, contrast, upscale } = req.body;
  const inputPath = req.file.path;
  const outputPath = path.join('public/uploads', `enhanced-${req.file.filename}`);

  try {
    let image = sharp(inputPath);
    switch (type) {
      case 'auto':
      case 'brighten': image = image.modulate({ brightness: parseFloat(brightness) || 1.2 }); break;
      case 'saturate': image = image.modulate({ saturation: parseFloat(saturation) || 1.3 }); break;
      case 'contrast': image = image.modulate({ contrast: parseFloat(contrast) || 1.2 }); break;
      case 'denoise': image = image.sharpen(); break;
      case 'upscale': image = image.resize({ width: Math.round((parseFloat(upscale) || 2) * req.file.width) }); break;
      case 'grayscale': image = image.grayscale(); break;
      case 'edge': image = image.sharpen(1, 1, 3); break;
      case 'sharpen': image = image.sharpen(); break;
      case 'colorize': image = image.modulate({ saturation: 1.5 }); break;
      case 'hdr': image = image.modulate({ brightness: 1.2, contrast: 1.2 }); break;
      case 'vintage': image = image.tint({ r: 255, g: 200, b: 150 }); break;
      case 'cartoon': image = image.sharpen().posterise(8); break;
      case 'blur': image = image.blur(2); break;
      case 'rotate': image = image.rotate(90); break;
      case 'crop': image = image.extract({ left: 100, top: 100, width: 300, height: 300 }); break;
      case 'sepia': image = image.tint({ r: 112, g: 66, b: 20 }); break;
      case 'invert': image = image.negate(); break;
      case 'sketch': image = image.grayscale().sharpen(2, 2, 5); break;
    }
    await image.toFile(outputPath);
    res.json({ originalFilename: req.file.filename, enhancedFilename: `enhanced-${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: 'Enhancement error: ' + err.message });
  }
});

app.get('/api/history', validateCsrfToken, async (req, res) => {
  const history = await loadData('history.json');
  res.json(history);
});

app.post('/api/history', validateCsrfToken, async (req, res) => {
  const { filename, type } = req.body;
  const history = await loadData('history.json');
  history.push({ filename, type });
  await saveData('history.json', history);
  res.status(200).send();
});

app.delete('/api/history', validateCsrfToken, async (req, res) => {
  await saveData('history.json', []);
  res.status(200).send();
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});