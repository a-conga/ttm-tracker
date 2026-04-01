exports.handler = async function(event) {
  const ticker = event.queryStringParameters?.ticker;
  if (!ticker) return { statusCode: 400, body: JSON.stringify({ error: "No ticker" }) };

  const key = process.env.FMP_API_KEY;
  const base = "https://financialmodelingprep.com/api/v3";

  try {
    const [incomeRes, evRes] = await Promise.all([
      fetch(`${base}/income-statement/${ticker}?period=quarter&limit=4&apikey=${key}`),
      fetch(`${base}/enterprise-values/${ticker}?limit=1&apikey=${key}`)
    ]);

    const income = await incomeRes.json();
    const evData = await evRes.json();

    if (!Array.isArray(income) || income.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ error: "No income data for " + ticker }) };
    }

    const ttmRevenue = income.slice(0, 4).reduce((s, q) => s + (q.revenue || 0), 0);
    const ev = Array.isArray(evData) && evData.length > 0 ? evData[0].enterpriseValue : null;
    const name = income[0]?.symbol || ticker;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ name, revenue: ttmRevenue, ev })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
