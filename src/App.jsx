import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus,
  Trash2, 
  AlertCircle,
  Search,
  Package,
  Share2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCzDDTTpZMHT13H58ud2LBNgPRvVackZd4",
  authDomain: "seguimientoproyectos-a9644.firebaseapp.com",
  projectId: "seguimientoproyectos-a9644",
  storageBucket: "seguimientoproyectos-a9644.firebasestorage.app",
  messagingSenderId: "904852309784",
  appId: "1:904852309784:web:7f5b2e811df62ce534406d"
};

// Inicialización segura de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "mi-despensa-hogar"; 

// --- Componentes ---

const ProductCard = ({ item, onUpdateQuantity, onDelete }) => {
  // Protección contra valores nulos
  const qty = item.quantity || 0;
  const minQty = item.minQuantity || 0;
  const isLowStock = qty <= minQty;
  
  return (
    <div className={`p-4 rounded-xl border shadow-sm transition-all ${
      isLowStock 
        ? 'bg-red-50 border-red-200' 
        : 'bg-white border-slate-100'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className={`font-bold text-lg ${isLowStock ? 'text-red-800' : 'text-slate-800'}`}>
            {item.name || "Producto sin nombre"}
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Mínimo ideal: {minQty}</span>
            {isLowStock && (
              <span className="flex items-center text-red-600 font-bold ml-1 bg-red-100 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3 mr-1" />
                ¡Comprar!
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={() => onDelete(item.id)}
          className="text-slate-300 hover:text-red-400 p-1"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between bg-white/50 p-2 rounded-lg">
        <span className="text-sm font-medium text-slate-600">Cantidad:</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onUpdateQuantity(item.id, qty - 1)}
            disabled={qty <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-30 active:scale-90 transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <span className={`text-xl font-bold w-8 text-center ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>
            {qty}
          </span>

          <button 
            onClick={() => onUpdateQuantity(item.id, qty + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-90 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PantryApp() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [filterText, setFilterText] = useState('');

  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newMin, setNewMin] = useState(2);

  useEffect(() => {
    signInAnonymously(auth).catch((error) => console.error("Error login:", error));
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const pantryRef = collection(db, 'artifacts', appId, 'public', 'pantry_items');
    
    const unsubscribe = onSnapshot(pantryRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // --- ORDENAMIENTO BLINDADO (AQUÍ ESTABA EL ERROR) ---
      list.sort((a, b) => {
        // Valores por defecto para evitar choques con null
        const qtyA = a.quantity || 0;
        const qtyB = b.quantity || 0;
        const minA = a.minQuantity || 0;
        const minB = b.minQuantity || 0;
        const nameA = (a.name || '').toLowerCase(); // Convertir a texto y minúsculas
        const nameB = (b.name || '').toLowerCase();

        const aLow = qtyA <= minA;
        const bLow = qtyB <= minB;

        if (aLow && !bLow) return -1;
        if (!aLow && bLow) return 1;
        
        // Comparación segura de strings
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      setItems(list);
      setLoading(false);
    }, (error) => {
      console.error("Error leyendo Firebase:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'pantry_items'), {
        name: newName,
        quantity: parseInt(newQty) || 0,
        minQuantity: parseInt(newMin) || 0,
        createdAt: serverTimestamp(),
      });
      setNewName('');
      setNewQty(1);
      setNewMin(2);
      setActiveTab('list');
    } catch (error) {
      alert("Error al agregar: " + error.message);
    }
  };

  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 0) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'pantry_items', id), {
        quantity: newQuantity
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'pantry_items', id));
  };

  const copyShoppingList = () => {
    const toBuy = items.filter(i => (i.quantity || 0) <= (i.minQuantity || 0));
    
    if (toBuy.length === 0) {
      alert("¡Todo está bien surtido!");
      return;
    }

    let text = "🛒 *LISTA DE COMPRAS*\n\n";
    toBuy.forEach(item => {
      const q = item.quantity || 0;
      const m = item.minQuantity || 0;
      const missing = (m - q) + 1;
      text += `[ ] ${item.name || 'Producto'} (Faltan: ${missing})\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      alert("📋 ¡Lista copiada!");
    });
  };

  const filteredItems = items.filter(i => 
    (i.name || '').toLowerCase().includes(filterText.toLowerCase())
  );

  const lowStockCount = items.filter(i => (i.quantity || 0) <= (i.minQuantity || 0)).length;

  if (loading) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24">
      
      {/* HEADER */}
      <header className="bg-emerald-600 text-white p-4 shadow-lg sticky top-0 z-10 rounded-b-xl">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Mi Despensa
            </h1>
            <button 
              onClick={copyShoppingList}
              className="bg-white text-emerald-700 px-3 py-2 rounded-lg text-xs font-bold shadow-md flex items-center gap-2 active:scale-95 transition-transform"
            >
              <Share2 className="w-4 h-4" />
              COPIAR
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-emerald-200" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full bg-emerald-700/50 border border-emerald-500 text-white placeholder-emerald-200 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-white/50"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="max-w-md mx-auto p-4">
        
        {activeTab === 'list' && (
          <>
            {lowStockCount > 0 && (
              <div className="mb-4 bg-red-100 border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{lowStockCount} por agotarse.</span>
              </div>
            )}

            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p>No hay productos.</p>
                </div>
              ) : (
                filteredItems.map(item => (
                  <ProductCard 
                    key={item.id} 
                    item={item} 
                    onUpdateQuantity={updateQuantity}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'add' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold mb-4 text-emerald-700">Nuevo Producto</h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    autoFocus
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="0"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mínimo</label>
                    <input
                      type="number"
                      min="1"
                      value={newMin}
                      onChange={(e) => setNewMin(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-red-50"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* FAB */}
      <div className="fixed bottom-6 left-0 right-0 z-20 pointer-events-none">
        <div className="max-w-md mx-auto px-6 flex justify-end pointer-events-auto">
          {activeTab === 'list' && (
            <button
              onClick={() => setActiveTab('add')}
              className="bg-emerald-600 text-white p-4 rounded-full shadow-xl hover:bg-emerald-700 active:scale-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-6 h-6" />
              <span className="font-bold pr-1">AGREGAR</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
}