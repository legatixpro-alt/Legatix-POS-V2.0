const fs = require('fs');
let code = fs.readFileSync('src/components/PosModule.tsx', 'utf-8');

// 1. Add states for partial payments
code = code.replace(
  "const [selectedMetodoPago, setSelectedMetodoPago] = useState<MetodoPago>('Pago Móvil');",
  `const paymentOptions = [
    { id: 'Pago Móvil', label: 'P. Móvil (Bs)', isUSD: false, icon: Smartphone },
    { id: 'Divisa', label: 'Punto (Bs)', isUSD: false, icon: CreditCard },
    { id: 'Efectivo', label: 'Efectivo (Bs)', isUSD: false, icon: Banknote },
    { id: 'Divisa', label: 'Efectivo ($)', isUSD: true, icon: DollarSign },
  ];
  const [selectedPaymentIdx, setSelectedPaymentIdx] = useState(0);
  const [pagos, setPagos] = useState<{id:string, label:string, isUSD:boolean, monto:number}[]>([]);
  const [montoInput, setMontoInput] = useState('');`
);

// 2. Add handleProcesar rewrite and payment functions
const regexProcesar = /const handleProcesar = \(\) => \{[\s\S]*?onCompletarVenta\(nuevaVenta\);\s*setCart\(\[\]\);\s*\};/;
code = code.replace(regexProcesar, `
  const handleAddPago = () => {
    const val = parseFloat(montoInput.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    const option = paymentOptions[selectedPaymentIdx];
    setPagos([...pagos, { id: Math.random().toString(), label: option.label, isUSD: option.isUSD, monto: val }]);
    setMontoInput('');
  };

  const handleRemovePago = (id: string) => {
    setPagos(pagos.filter(p => p.id !== id));
  };

  const totalPagadoUSD = pagos.reduce((acc, p) => acc + (p.isUSD ? p.monto : p.monto / config.tasaCambioUSD), 0);
  const totalPagadoBs = pagos.reduce((acc, p) => acc + (p.isUSD ? p.monto * config.tasaCambioUSD : p.monto), 0);
  const faltaUSD = cartTotalUSD - totalPagadoUSD;
  const isCredito = faltaUSD > 0.001;
  const isCambio = faltaUSD < -0.001;

  const handleProcesar = () => {
    if (cart.length === 0) return;

    let finalMethod: MetodoPago = 'Mixto';
    if (pagos.length === 1 && !isCredito) finalMethod = pagos[0].label.includes('Efectivo') ? 'Efectivo' : pagos[0].label.includes('Móvil') ? 'Pago Móvil' : 'Divisa';
    if (isCredito && pagos.length === 0) finalMethod = 'Fiado';

    const nuevaVenta: VentaMaestro = {
      ID_Transaccion: Math.random().toString(36).substring(7),
      Fecha_Hora: new Date().toISOString(),
      Total_Venta: cartTotalUSD,
      Metodo_Pago: finalMethod,
      Estado_Transaccion: isCredito ? 'Pendiente' : 'Completada',
      Tasa_Cambio_Aplicada: config.tasaCambioUSD,
      Total_Moneda_Local: cartTotalUSD * config.tasaCambioUSD,
      ID_Usuario: 'Usuario1',
      Items_Count: cart.reduce((acc, item) => acc + item.cantidad, 0),
    };

    onCompletarVenta(nuevaVenta);
    setCart([]);
    setPagos([]);
    setMontoInput('');
  };
`);

fs.writeFileSync('src/components/PosModule.tsx', code);
