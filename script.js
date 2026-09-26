const STORAGE_KEY = "cristo_morado_election_state";
const COMMITTEE_PIN = "123456";

const padronBase = [
  { dni: "12345678", nombre: "Ana García", grado: "5°A", estado: "No votó" },
  { dni: "23456789", nombre: "Luis Pérez", grado: "5°B", estado: "No votó" },
  { dni: "34567890", nombre: "Sofía López", grado: "6°A", estado: "No votó" },
  { dni: "45678901", nombre: "Mateo Ramírez", grado: "6°B", estado: "No votó" },
  { dni: "56789012", nombre: "Camila Torres", grado: "4°A", estado: "No votó" },
  { dni: "67890123", nombre: "Diego Castro", grado: "4°B", estado: "No votó" },
  { dni: "78901234", nombre: "Valeria Soto", grado: "3°A", estado: "No votó" },
  { dni: "89012345", nombre: "Sebastián Ruiz", grado: "3°B", estado: "No votó" },
  { dni: "90123456", nombre: "Lucía Mendoza", grado: "2°A", estado: "No votó" },
  { dni: "01234567", nombre: "Bruno Flores", grado: "2°B", estado: "No votó" },
  { dni: "10234567", nombre: "Renata Quispe", grado: "1°A", estado: "No votó" },
  { dni: "20345678", nombre: "José Huamán", grado: "1°B", estado: "No votó" }
];

const firebaseConfig = {
  apiKey: "AIzaSyAClUbtJsRmvajMwYoEuedavhsfLiIrCXA",
  authDomain: "cristo-morado-elecciones.firebaseapp.com",
  databaseURL: "https://cristo-morado-elecciones-default-rtdb.firebaseio.com",
  projectId: "cristo-morado-elecciones",
  storageBucket: "cristo-morado-elecciones.firebasestorage.app",
  messagingSenderId: "833819628435",
  appId: "1:833819628435:web:1bc367651b434b2b198e66"
};

const defaultState = {
  votes: { lista1: 0, lista2: 0, blanco: 0 },
  voters: padronBase.map((student) => ({ ...student }))
};

let currentVoter = null;
let db = null;
let isFirebaseReady = false;

function initFirebase() {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    isFirebaseReady = true;
    return true;
  } catch (error) {
    console.warn("Firebase no se pudo inicializar:", error);
    return false;
  }
}

function getLocalState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return structuredClone(defaultState);
  }
  return JSON.parse(saved);
}

function saveLocalState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getState() {
  return getLocalState();
}

function saveState(state) {
  saveLocalState(state);
  if (isFirebaseReady && db) {
    db.ref("elecciones/cristo-morado").set(state).catch((err) => console.error("Error Firebase:", err));
  }
}

function syncFromFirebase() {
  if (!isFirebaseReady || !db) return;

  const ref = db.ref("elecciones/cristo-morado");
  ref.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data && data.voters) {
      saveLocalState(data);
      if (document.getElementById("resultsPanel") && !document.getElementById("resultsPanel").classList.contains("hidden")) {
        renderResults();
      }
    }
  });
}

function showSection(sectionId) {
  const sections = ["roleSelector", "voterSection", "voteSection", "confirmationSection", "committeeSection"];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== sectionId);
  });
}

function setMessage(id, text, type = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = "message";
  if (type) el.classList.add(type);
}

function verifyDNI() {
  const dni = document.getElementById("dniInput").value.trim();

  if (!/^\d{8}$/.test(dni)) {
    setMessage("dniMessage", "Ingrese un DNI válido de 8 dígitos.", "error");
    return;
  }

  const state = getState();
  const voter = state.voters.find((student) => student.dni === dni);

  if (!voter) {
    setMessage("dniMessage", "El DNI no está registrado en el padrón.", "error");
    return;
  }

  if (voter.estado === "Votó") {
    setMessage("dniMessage", "Este estudiante ya registró su voto.", "error");
    return;
  }

  currentVoter = voter;
  document.getElementById("voterInfo").textContent = `${voter.nombre} - ${voter.grado}`;
  setMessage("dniMessage", "DNI verificado correctamente.", "success");
  showSection("voteSection");
}

function castVote(voteType) {
  if (!currentVoter) return;

  const state = getState();
  const index = state.voters.findIndex((student) => student.dni === currentVoter.dni);

  if (index === -1) return;

  state.voters[index].estado = "Votó";
  state.votes[voteType] = (state.votes[voteType] || 0) + 1;
  saveState(state);
  showSection("confirmationSection");
}

function renderResults() {
  const state = getState();
  const totalStudents = state.voters.length;
  const totalVotes = Object.values(state.votes).reduce((sum, value) => sum + value, 0);
  const totalForPercentage = totalVotes || 1;

  document.getElementById("lista1Count").textContent = state.votes.lista1;
  document.getElementById("lista2Count").textContent = state.votes.lista2;
  document.getElementById("blancoCount").textContent = state.votes.blanco;
  document.getElementById("totalVotes").textContent = totalVotes;
  document.getElementById("lista1Percent").textContent = `${((state.votes.lista1 / totalForPercentage) * 100).toFixed(1)}%`;
  document.getElementById("lista2Percent").textContent = `${((state.votes.lista2 / totalForPercentage) * 100).toFixed(1)}%`;
  document.getElementById("blancoPercent").textContent = `${((state.votes.blanco / totalForPercentage) * 100).toFixed(1)}%`;
  document.getElementById("participationPercent").textContent = `${totalStudents ? ((totalVotes / totalStudents) * 100).toFixed(1) : "0.0"}%`;
  document.getElementById("totalStudents").textContent = totalStudents;
  document.getElementById("remainingVoters").textContent = totalStudents - totalVotes;

  const tableBody = document.getElementById("padronTableBody");
  tableBody.innerHTML = "";
  state.voters.forEach((student) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${student.dni}</td>
      <td>${student.nombre}</td>
      <td>${student.grado}</td>
      <td>${student.estado}</td>
    `;
    tableBody.appendChild(row);
  });
}

function verifyCommitteeAccess() {
  const pin = document.getElementById("pinInput").value.trim();

  if (pin !== COMMITTEE_PIN) {
    setMessage("committeeMessage", "PIN incorrecto. Intente nuevamente.", "error");
    return;
  }

  setMessage("committeeMessage", "Acceso autorizado.", "success");
  document.getElementById("resultsPanel").classList.remove("hidden");
  renderResults();
  syncFromFirebase();
}

function resetVoterSession() {
  currentVoter = null;
  document.getElementById("dniInput").value = "";
  setMessage("dniMessage", "", "");
  showSection("roleSelector");
}

function logoutCommittee() {
  document.getElementById("pinInput").value = "";
  setMessage("committeeMessage", "", "");
  document.getElementById("resultsPanel").classList.add("hidden");
  showSection("roleSelector");
}

function initializeApp() {
  initFirebase();
  
  if (isFirebaseReady && db) {
    const firebaseRef = db.ref("elecciones/cristo-morado");
    firebaseRef.once("value").then((snapshot) => {
      const data = snapshot.val();
      if (!data) {
        firebaseRef.set(defaultState);
        saveLocalState(defaultState);
      } else {
        saveLocalState(data);
      }
      renderResults();
    }).catch((err) => {
      console.error("Error al inicializar:", err);
      saveLocalState(defaultState);
      renderResults();
    });
  } else {
    saveLocalState(defaultState);
    renderResults();
  }
  
  showSection("roleSelector");
}

document.getElementById("btnVoter").addEventListener("click", () => showSection("voterSection"));
document.getElementById("btnCommittee").addEventListener("click", () => showSection("committeeSection"));

document.getElementById("verifyDniBtn").addEventListener("click", verifyDNI);
document.getElementById("dniInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") verifyDNI();
});

document.querySelectorAll("[data-vote]").forEach((button) => {
  button.addEventListener("click", () => castVote(button.dataset.vote));
});

document.getElementById("backToVoter").addEventListener("click", resetVoterSession);
document.getElementById("loginCommitteeBtn").addEventListener("click", verifyCommitteeAccess);
document.getElementById("pinInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") verifyCommitteeAccess();
});
document.getElementById("logoutCommitteeBtn").addEventListener("click", logoutCommittee);

initializeApp();
