const API_KEY = "6b5dcef2d9d240088bef2f844e31df7e"; // Coloque sua chave da API aqui
let chart;

const pairSelect = document.getElementById("pairSelect");
pairSelect.addEventListener("change", () => updateSignals(pairSelect.value));

async function fetchData(symbol) {
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&outputsize=100&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.values.map(v => parseFloat(v.close)).reverse();
}

// SMA
function SMA(prices, period) {
  let sma = [];
  for (let i = 0; i <= prices.length - period; i++) {
    const slice = prices.slice(i, i + period);
    sma.push(slice.reduce((a,b)=>a+b,0)/period);
  }
  return sma;
}

// EMA
function EMA(prices, period) {
  const k = 2/(period+1);
  let ema = [prices[0]];
  for (let i=1; i<prices.length; i++){
    ema.push(prices[i]*k + ema[i-1]*(1-k));
  }
  return ema;
}

// RSI
function RSI(prices, period=14) {
  let gains = [], losses = [];
  for(let i=1;i<prices.length;i++){
    let diff = prices[i]-prices[i-1];
    if(diff>=0) gains.push(diff), losses.push(0);
    else gains.push(0), losses.push(-diff);
  }
  let avgGain = gains.slice(0, period).reduce((a,b)=>a+b,0)/period;
  let avgLoss = losses.slice(0, period).reduce((a,b)=>a+b,0)/period;
  let rsi = [100 - 100/(1 + avgGain/avgLoss)];
  
  for(let i=period;i<gains.length;i++){
    avgGain = (avgGain*(period-1) + gains[i])/period;
    avgLoss = (avgLoss*(period-1) + losses[i])/period;
    rsi.push(100 - 100/(1 + avgGain/avgLoss));
  }
  return rsi;
}

// MACD
function MACD(prices, shortPeriod=12, longPeriod=26, signalPeriod=9){
  let emaShort = EMA(prices, shortPeriod);
  let emaLong = EMA(prices, longPeriod);
  let macdLine = emaShort.map((v,i)=>v - emaLong[i]);
  let signalLine = EMA(macdLine.slice(longPeriod-1), signalPeriod);
  return { macdLine, signalLine };
}

// Gerar sinal
function generateSignal(prices){
  const ema = EMA(prices, 50);
  const rsi = RSI(prices).slice(-1)[0];
  const macdObj = MACD(prices);
  const macd = macdObj.macdLine.slice(-1)[0];
  const signalLine = macdObj.signalLine.slice(-1)[0];

  let signal = "↔️ Sem tendência clara";
  if(prices[prices.length-1] > ema[ema.length-1] && rsi < 70 && macd > signalLine){
    signal = "📈 COMPRA";
  } else if(prices[prices.length-1] < ema[ema.length-1] && rsi > 30 && macd < signalLine){
    signal = "📉 VENDA";
  }
  return signal;
}

// Atualizar sinais e gráfico
async function updateSignals(symbol = "EUR/USD") {
  const prices = await fetchData(symbol);
  const signal = generateSignal(prices);
  document.getElementById("signal").innerText = signal;

  if(chart) chart.destroy();

  chart = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      labels: prices.map((_,i)=>i),
      datasets: [
        { label: 'Preço', data: prices, borderColor:'cyan', fill:false },
        { label: 'SMA50', data: SMA(prices,50).concat(Array(prices.length-50).fill(null)), borderColor:'yellow', fill:false },
        { label: 'EMA50', data: EMA(prices,50), borderColor:'magenta', fill:false }
      ]
    }
  });
}

// Atualiza automaticamente a cada 60 segundos
updateSignals();
setInterval(() => updateSignals(pairSelect.value), 60000);
