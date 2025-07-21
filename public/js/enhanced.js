async function analyzeImage(imageFile) {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    img.src = URL.createObjectURL(imageFile);
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      let brightnessSum = 0, saturationSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        brightnessSum += (r + g + b) / 3;
        saturationSum += Math.max(r, g, b) - Math.min(r, g, b);
      }
      const pixelCount = data.length / 4;
      const avgBrightness = brightnessSum / pixelCount / 255;
      const avgSaturation = saturationSum / pixelCount / 255;
      resolve({
        brightness: avgBrightness < 0.5 ? 1.2 : 1.0,
        saturation: avgSaturation < 0.3 ? 1.3 : 1.0,
        contrast: avgBrightness < 0.4 ? 1.2 : 1.0,
        upscale: img.width < 800 ? 2 : 1,
      });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ brightness: 1.0, saturation: 1.0, contrast: 1.0, upscale: 1 });
  });
}

function previewImage() {
  const fileInput = document.getElementById('imageInput');
  const previewBefore = document.getElementById('previewBefore');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    previewBefore.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Original Image">`;
  }
}

async function enhanceImage(type) {
  const fileInput = document.getElementById('imageInput');
  const previewBefore = document.getElementById('previewBefore');
  const preview = document.getElementById('imagePreview');
  if (!fileInput.files || !fileInput.files[0]) {
    alert('Please select an image to enhance');
    return;
  }

  const file = fileInput.files[0];
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxFileSize) {
    alert('File size exceeds 50MB limit');
    return;
  }

  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', type);

  const params = await analyzeImage(file);
  formData.append('brightness', params.brightness);
  formData.append('saturation', params.saturation);
  formData.append('contrast', params.contrast);
  formData.append('upscale', params.upscale);

  const csrfToken = localStorage.getItem('csrfToken');
  if (!csrfToken) {
    alert('Session expired. Please log in again.');
    window.location.href = 'login.html';
    return;
  }

  preview.innerHTML = '<img src="/assets/loading.gif" class="enhance-animation" alt="Enhancing..." style="max-width: 100px;">';

  try {
    const response = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'CSRF-Token': csrfToken },
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Enhancement failed');
    if (result.enhancedFilename) {
      previewBefore.innerHTML = `<img src="/uploads/${result.originalFilename}?t=${Date.now()}" alt="Original">`;
      preview.innerHTML = `<img src="/uploads/${result.enhancedFilename}?t=${Date.now()}" alt="Enhanced">`;
      localStorage.setItem('currentImage', result.enhancedFilename);
    }
  } catch (err) {
    alert('Enhancement failed: ' + err.message);
    preview.innerHTML = '';
  }
}

function downloadImage() {
  const filename = localStorage.getItem('currentImage');
  if (!filename) {
    alert('No enhanced image to download');
    return;
  }
  const link = document.createElement('a');
  link.href = `/uploads/${filename}?t=${Date.now()}`;
  link.download = `enhanced-${filename}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function saveToHistory() {
  const filename = localStorage.getItem('currentImage');
  if (!filename) {
    alert('No image to save');
    return;
  }
  const csrfToken = localStorage.getItem('csrfToken');
  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ filename, type: 'saved' }),
    });
    if (!response.ok) throw new Error('Failed to save to history');
    loadHistory();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
}

async function loadHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;
  const csrfToken = localStorage.getItem('csrfToken');
  try {
    const response = await fetch('/api/history', {
      headers: { 'CSRF-Token': csrfToken },
    });
    if (!response.ok) throw new Error('Failed to load history');
    const history = await response.json();
    historyList.innerHTML = history
      .map(item => `<li class="list-group-item">${item.filename} - ${item.type}</li>`)
      .join('');
  } catch (err) {
    historyList.innerHTML = '<li class="list-group-item">No history available</li>';
  }
}

async function clearHistory() {
  const csrfToken = localStorage.getItem('csrfToken');
  try {
    const response = await fetch('/api/history', {
      method: 'DELETE',
      headers: { 'CSRF-Token': csrfToken },
    });
    if (!response.ok) throw new Error('Failed to clear history');
    loadHistory();
  } catch (err) {
    alert('Clear failed: ' + err.message);
  }
}