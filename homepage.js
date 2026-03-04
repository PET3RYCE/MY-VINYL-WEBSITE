// ===== CONFIG =====
const KEY = "vinyls";
const DEF_IMG = "./immagini/Vinile.jpg";
let editingId = null;


// Backup predefinito incorporato
const DEFAULT_BACKUP = [
  {
    id: "1",
    album: "Album di esempio",
    artist: "Artista di esempio",
    cover: "",
    color: "Nero",
    purchasePrice: 20,
    currentValue: 25,
    signedBefore: "NO",
    signedAfter: "NO",
    numbered: "",
    condition: "NM",
    purchaseDate: "01/01/2025",
    imageUrl: DEF_IMG,
    status: "work",
    createdAt: new Date().toISOString()
  }
];

// ===== UTILS =====
const $ = id => document.getElementById(id);
const getYear = () => { $("year").textContent = new Date().getFullYear(); };
const readVinyls = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || DEFAULT_BACKUP; }
  catch { return DEFAULT_BACKUP; }
};
const writeVinyls = list => localStorage.setItem(KEY, JSON.stringify(list));
const alertBox = (type, msg) => {
  $("alerts").innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
};
const toEuro = n => (n != null && !isNaN(n)) ? `${n.toFixed(2)} €` : "-";
const isValidItalianDate = s => {
  if (!s) return false;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return false;
  const [_, dd, mm, yyyy] = m;
  const d = Number(dd), mth = Number(mm), y = Number(yyyy);
  if(mth<1||mth>12) return false;
  const last = new Date(y, mth, 0).getDate();
  return d>=1 && d<=last;
};

function parseItalianDate(str) {
  if (!str) return null;
  const [dd, mm, yyyy] = str.split("/");
  return new Date(yyyy, mm - 1, dd);
}


// ===== CREATE CARD =====
function createCard(v) {
  const col = document.createElement("div");
  col.className = "col";
  col.draggable = true;
  col.dataset.id = v.id;

  col.innerHTML = `
    <div class="card h-100 shadow-sm">
      <img src="${v.imageUrl||DEF_IMG}" class="card-img-top" alt="${v.album}">
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${v.album}</h5>
        <ul class="list-unstyled small mb-3">
          <li><strong>Artista:</strong> ${v.artist}</li>
          <li><strong>Cover:</strong> ${v.cover||"-"}</li>
          <li><strong>Colore:</strong> ${v.color||"-"}</li>
          <li><strong>Comprato:</strong> ${toEuro(v.purchasePrice)}</li>
          <li><strong>Valore:</strong> ${toEuro(v.currentValue)}</li>
          <li><strong>Firmato</strong> Prima: ${v.signedBefore||"-"} | Dopo: ${v.signedAfter||"-"} | Numerato: ${v.numbered||"-"}</li>
          <li><strong>Condizione:</strong> ${v.condition||"-"}</li>
          <li><strong>Codice Barre:</strong> ${v.ean || "-"}</li>
          <li><strong>Giorno d’acquisto:</strong> ${v.purchaseDate||"-"}</li>
          <li><strong>Priorità:</strong> ${v.priority || "-"}</li>
          <li><strong>Negozio:</strong> ${
            (v.store && v.store.length ? v.store.filter(s => s.toUpperCase() !== "ALTRO").join(", ") : "")
            +
            (v.store && v.store.some(s => s.toUpperCase() === "ALTRO") && v.storeOther
              ? (v.store && v.store.filter(s => s.toUpperCase() !== "ALTRO").length ? ", " : "") + v.storeOther
              : (v.store && v.store.length ? "" : "-"))
          }</li>
        </ul>
        <div class="mt-auto pt-2 d-flex justify-content-between align-items-center">
          <button class="btn btn-sm btn-outline-warning edit-vinyl"><i class="bi bi-pencil"></i></button>
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle status-toggle" type="button" data-bs-toggle="dropdown">Stato</button>
            <ul class="dropdown-menu">
              <li><button class="dropdown-item status-btn" data-status="ok">✅</button></li>
              <li><button class="dropdown-item status-btn" data-status="work">🚧</button></li>
              <li><button class="dropdown-item status-btn" data-status="usa">❌🔴⚪🔵</button></li>
              <li><button class="dropdown-item status-btn" data-status="ita">❌🟢⚪🔴</button></li>
            </ul>
          </div>
          <button class="btn btn-sm btn-outline-danger delete-vinyl"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>`;

  col.querySelector("img").addEventListener("error", ()=>col.querySelector("img").src=DEF_IMG);

  const card = col.querySelector(".card");
  const toggle = col.querySelector(".status-toggle");
  const labels = { ok: "✅", work: "🚧", usa: "❌🔴⚪🔵", ita: "❌🟢⚪🔴"}; 
  const status = v.status || "work"; 
  toggle.textContent = labels[status]; 
  card.classList.add(`status-${status}`);

  col.querySelectorAll(".status-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const list = readVinyls();
      const updated = list.map(x => x.id === v.id ? { ...x, status: btn.dataset.status } : x);
      writeVinyls(updated);
      renderList(updated);
    });
  });

  col.querySelector(".delete-vinyl").addEventListener("click", ()=>{ 
    const all = readVinyls().filter(x=>x.id!==v.id); 
    writeVinyls(all); 
    renderList(all); 
    alertBox("warning","Vinile eliminato."); 
  });

  col.querySelector(".edit-vinyl").addEventListener("click", ()=>{ 
    editingId=v.id; 
    ["album","artist","ean","cover","color","purchasePrice","currentValue","signedBefore","signedAfter","numbered","condition","purchaseDate","imageUrl","priority"]
      .forEach(id=>$(id).value=v[id]??"");
    // Negozio (checkbox)
    const storeList = v.store || [];
    document.querySelectorAll('#store-checkboxes .form-check-input').forEach(cb => {
      cb.checked = storeList.includes(cb.value);
    });
    if (storeList.some(s => s.toUpperCase() === "ALTRO")) {
      $("storeOther").classList.remove("d-none");
      $("storeOther").value = v.storeOther || "";
    } else {
      $("storeOther").classList.add("d-none");
      $("storeOther").value = "";
    }
    alertBox("info","Stai modificando il vinile selezionato. Premi INVIA per salvare.");
    $("album").focus();
  });

  return col; 
}

// ===== TOTALI ===== 
function updateTotals(list) { 
  const ok = list.filter(v => v.status === "ok"); 
  const work = list.filter(v => v.status === "work"); 
  const usa= list.filter(v => v.status === "usa"); 
  const ita = list.filter(v => v.status === "ita"); 
  
  // contatori per sezione 
  $("count-ok").textContent = ok.length; 
  $("count-work").textContent = work.length; 
  $("count-usa").textContent = usa.length; 
  $("count-ita").textContent = ita.length; 
  
  // TOTALI SOLO SEZIONE OK (vinili posseduti) 
  const totaleComprato = ok.reduce( 
    (sum, v) => sum + (v.purchasePrice || 0), 
    0 
  ); 
  const totaleValore = ok.reduce( 
    (sum, v) => sum + (v.currentValue || 0), 
    0 
  ); 
  
  $("tot-comprato").textContent = `${totaleComprato.toFixed(2)} €`; 
  $("tot-valore").textContent = `${totaleValore.toFixed(2)} €`; 
  
  // empty state globale 
  $("empty-state").classList.toggle("d-none", list.length > 0); 
}

// ===== RENDER LIST ===== 
function renderList(list) { 
  ["ok","work","usa","ita"].forEach(section => { 
    const row = $(`row-${section}`); 
    row.innerHTML = ""; 
    let filteredSection = list.filter(v=>v.status===section); 
    // Ordinamento automatico 
    const sortEl = $(`sort-${section}`); 
    if(sortEl && sortEl.value){ 
      const key = sortEl.value.startsWith("-")?sortEl.value.slice(1):sortEl.value; 
      const desc = sortEl.value.startsWith("-"); 
      filteredSection.sort((a, b) => { 
        let va = a[key]; 
        let vb = b[key]; 

        // 🔹 CASO DATA 
        if (key === "purchaseDate") { 
          va = parseItalianDate(a.purchaseDate); 
          vb = parseItalianDate(b.purchaseDate); 

          // date mancanti → vanno in fondo 
          if (!va && !vb) return 0; 
          if (!va) return 1; 
          if (!vb) return -1; 

          return desc ? vb - va : va - vb; 
        } 

        // 🔹 CASO FIRMATO 
        if (key === "signed") { 
          va = a.signedBefore === "SI" || a.signedAfter === "SI" ? 1 : 0; 
          vb = b.signedBefore === "SI" || b.signedAfter === "SI" ? 1 : 0; 
        } 

        // 🔹 CASO PRIORITÀ
        if (key === "priority") {
          va = a.priority ? parseInt(a.priority) : 0;
          vb = b.priority ? parseInt(b.priority) : 0;
        }

        // 🔹 STRINGHE 
        if (typeof va === "string") va = va.toLowerCase(); 
        if (typeof vb === "string") vb = vb.toLowerCase(); 

        if (va > vb) return desc ? -1 : 1; 
        if (va < vb) return desc ? 1 : -1; 
        return 0; 
      }); 
    } 
    filteredSection.forEach(v => row.appendChild(createCard(v))); 
    $(`count-${section}`).textContent = filteredSection.length; 
  }); 

  updateTotals(list); 
  enableDragDrop(); 
}

// ===== DRAG & DROP ===== 
function enableDragDrop() { 
  ["row-ok","row-work","row-usa","row-ita"].forEach(rowId=>{ 
    const row = $(rowId); 
    if(!row) return; 
    let dragged = null; 
  
    row.querySelectorAll(".col").forEach(col=>{ 
      col.addEventListener("dragstart", e=>{ 
        dragged=col; 
        col.classList.add("opacity-50"); 
        e.dataTransfer.effectAllowed="move"; 
      }); 
      col.addEventListener("dragend", ()=>{ 
        col.classList.remove("opacity-50"); 
        dragged=null; 
        saveOrder(); 
      }); 
      col.addEventListener("dragover", e=>{ 
        e.preventDefault(); 
        if(!dragged || dragged===col) return; 
        const rect=col.getBoundingClientRect(); 
        const after=e.clientY>rect.top+rect.height/2; 
        row.insertBefore(dragged, after ? col.nextSibling : col); 
      }); 
    }); 
  }); 
}

function saveOrder(){ 
  ["row-ok","row-work","row-usa","row-ita"].forEach(rowId=>{ 
    const row=$(rowId); 
    const ids=[...row.querySelectorAll(".col")].map(c=>c.dataset.id); 
    let list=readVinyls(); 
    list.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)); 
    writeVinyls(list); 
  }); 
}

// ===== FORM ===== 
function clearForm(){ 
  ["album","artist","ean","cover","color","purchasePrice","currentValue","signedBefore","signedAfter","numbered","condition","purchaseDate","imageUrl","priority"] 
    .forEach(id=>{ 
      const el=$(id); if(!el)return; 
      el.tagName==="SELECT"?el.selectedIndex=0:el.value=""; 
    }); 
  editingId=null; 
 $("album").focus(); 
}

// ===== INIT ===== 
document.addEventListener("DOMContentLoaded", ()=>{ 
  getYear(); 
  renderList(readVinyls()); 
  
  // Gestione checkbox Negozio
  document.querySelectorAll('#store-checkboxes .form-check-input').forEach(cb => {
    cb.addEventListener('change', function() {
      if (this.value.toUpperCase() === 'ALTRO') {
        if (this.checked) {
          $("storeOther").classList.remove("d-none");
        } else {
          $("storeOther").classList.add("d-none");
          $("storeOther").value = "";
        }
      }
    });
  });


  // Form submit
  $("vinyl-form").addEventListener("submit", e=>{
    e.preventDefault();
    const album=$("album").value.trim();
    const artist=$("artist").value.trim();
    if(!album||!artist){ alertBox("danger","Compila almeno ALBUM e ARTISTA."); return; }

    const purchaseDate=$("purchaseDate").value.trim();
    if(purchaseDate && !isValidItalianDate(purchaseDate)){ alertBox("danger","Inserisci la data GG/MM/AAAA valida."); return; }

    const rawUrl=$("imageUrl").value.trim();
    const imageUrl=rawUrl.startsWith("https://")?rawUrl:"";

    // Negozio (checkbox)
    const storeValues = Array.from(document.querySelectorAll('#store-checkboxes .form-check-input:checked')).map(cb => cb.value);
    const storeOther = $("storeOther").value.trim();

    // Status dal form
    const status = $("status-select") ? $("status-select").value : (editingId ? readVinyls().find(v=>v.id===editingId).status : "work");

    const vinylData={
      album, artist,
      cover: $("cover").value.trim(),
      color: $("color").value.trim(),
      purchasePrice:$("purchasePrice").value?parseFloat($("purchasePrice").value):0,
      currentValue:$("currentValue").value?parseFloat($("currentValue").value):0,
      signedBefore:$("signedBefore").value,
      signedAfter:$("signedAfter").value,
      numbered:$("numbered").value.trim(),
      condition:$("condition").value,
      ean: $("ean").value.trim(),
      purchaseDate,
      imageUrl,
      priority: $("priority").value,
      status: status,
      store: storeValues,
      storeOther: storeValues.some(s => s.toUpperCase() === "ALTRO") ? storeOther : ""
    };

    let list=readVinyls(); 
    if(editingId){ 
      list=list.map(v=>v.id===editingId?{...v,...vinylData}:v); 
      alertBox("success","Vinile aggiornato con successo!"); 
      editingId=null; 
    } else { 
      list.push({id:Date.now().toString(), ...vinylData, createdAt:new Date().toISOString()}); 
      alertBox("success","Vinile aggiunto!"); 
    } 

    writeVinyls(list); 
    renderList(list); 
    clearForm(); 
  }); 
  
  $("reset-btn").addEventListener("click", clearForm); 
  
  // Ricerca globale 
  $("globalSearchInput").addEventListener("input", ()=>{ 
    const query=$("globalSearchInput").value.trim().toLowerCase(); 
    const filtered = readVinyls().filter(v => 
      v.album.toLowerCase().includes(query) || 
      v.artist.toLowerCase().includes(query) || 
      (v.ean && v.ean.toLowerCase().includes(query)) || 
      (v.cover && v.cover.toLowerCase().includes(query)) || 
      (v.color && v.color.toLowerCase().includes(query)) 
    ); 
    renderList(filtered); 
  }); 
  
  // Ordinamenti sezione 
  ["ok","work","usa","ita"].forEach(section=>{ 
    $(`sort-${section}`)?.addEventListener("change", ()=>renderList(readVinyls())); 
  }); 
  
  // ===== BACKUP EXPORT ===== 
  $("export-btn")?.addEventListener("click", () => { 
    const data = readVinyls(); 
    const blob = new Blob( 
      [JSON.stringify(data, null, 2)], 
      { type: "application/json" } 
    ); 
  
    const url = URL.createObjectURL(blob); 
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = `vinyl_backup_${new Date().toISOString().slice(0,10)}.json`; 
    a.click(); 
  
    URL.revokeObjectURL(url); 
  }); 
  
  // ===== BACKUP IMPORT ===== 
  $("import-input")?.addEventListener("change", e => { 
    const file = e.target.files[0]; 
    if (!file) return; 
  
    const reader = new FileReader(); 
    reader.onload = () => { 
      try { 
        const data = JSON.parse(reader.result); 
  
        if (!Array.isArray(data)) { 
          alertBox("danger", "File non valido."); 
          return; 
        } 
      
        writeVinyls(data); 
        renderList(data); 
        alertBox("success", "Backup importato con successo!"); 
      } catch { 
        alertBox("danger", "Errore durante l'importazione del file."); 
      } 
    }; 
  
    reader.readAsText(file); 
    e.target.value = ""; // reset input 
  }); 
  
});
