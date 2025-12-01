import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// --- TU CONFIGURACIÓN (La que me pasaste) ---
const firebaseConfig = {
  apiKey: "AIzaSyCzDDTTpZMHT13H58ud2LBNgPRvVackZd4",
  authDomain: "seguimientoproyectos-a9644.firebaseapp.com",
  projectId: "seguimientoproyectos-a9644",
  storageBucket: "seguimientoproyectos-a9644.firebasestorage.app",
  messagingSenderId: "904852309784",
  appId: "1:904852309784:web:7f5b2e811df62ce534406d"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [status, setStatus] = useState("Iniciando...");
  const [error, setError] = useState(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        setStatus("Intentando autenticación anónima...");
        const userCred = await signInAnonymously(auth);
        setStatus(`¡Autenticación Exitosa! Usuario: ${userCred.user.uid}. Probando base de datos...`);
        
        // Prueba de lectura a una colección cualquiera
        await getDocs(collection(db, 'test_connection'));
        setStatus("✅ CONEXIÓN TOTALMENTE EXITOSA. Firebase funciona.");
      } catch (e) {
        console.error(e);
        setError(e.message);
        setStatus("❌ FALLÓ LA CONEXIÓN");
      }
    };
    testConnection();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Prueba de Conexión Firebase</h1>
      <div style={{ padding: 20, backgroundColor: error ? '#fee' : '#eef', borderRadius: 8 }}>
        <strong>Estado:</strong> {status}
      </div>
      {error && (
        <div style={{ marginTop: 20, color: 'red' }}>
          <strong>Error detectado:</strong>
          <pre>{error}</pre>
        </div>
      )}
    </div>
  );
}