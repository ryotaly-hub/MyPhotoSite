function formatDate(dateCreated) {
  if (!dateCreated) return '';
  const d = new Date(dateCreated);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

async function loadPhotos() {
  const statusEl = document.getElementById('status');
  const galleryEl = document.getElementById('gallery');
  const titleEl = document.getElementById('album-title');

  try {
    const res = await fetch('/api/photos');
    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.error || '写真の取得に失敗しました。';
      return;
    }

    if (data.title) {
      titleEl.textContent = data.title;
    }

    if (data.photos.length === 0) {
      statusEl.textContent = '写真が見つかりませんでした。';
      return;
    }

    statusEl.remove();
    for (const photo of data.photos) {
      const figure = document.createElement('figure');

      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.caption || '';
      img.loading = 'lazy';
      figure.appendChild(img);

      const dateEl = document.createElement('figcaption');
      dateEl.textContent = formatDate(photo.dateCreated);
      figure.appendChild(dateEl);

      galleryEl.appendChild(figure);
    }
  } catch (err) {
    statusEl.textContent = '写真の取得中にエラーが発生しました。';
    console.error(err);
  }
}

loadPhotos();
