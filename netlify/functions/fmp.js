exports.handler = async function(event) {
  const ticker = event.queryStringParameters?.ticker;
  if (!ticker) return { statusCode: 400, body: JSON.stringify({ error: "No ticker" }) };

  const key = process.env.FMP_API_KEY;
  const base = "https://financialmodelingprep.com/api/v3";

  try {
    const [incomeRes, evRes, profileRes] = await Promise.all([
      fetch(`${base}/income-statement/${ticker}?period=quarter&limit=5&apikey=${key}`),
      fetch(`${base}/enterprise-values/${ticker}?period=quarter&limit=1&apikey=${key}`),
      fetch(`${base}/profile/${ticker}?apikey=${key}`)
    ]);

    const income = await incomeRes.json();
    const evData = await evRes.json();
    const profile = await profileRes.json();

    // Debug: log what we get back
    console.log("INCOME:", JSON.stringify(income).slice(0, 300));
    console.log("EV:", JSON.stringify(evData).slice(0, 300));

    if (!Array.isArray(income) || income.length === 0) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No income data for " + ticker })
      };
    }

    // Sum last 4 quarters of revenue
    const quarters = income.slice(0, 4);
    const ttmRevenue = quarters.reduce((s, q) => {
      const r = parseFloat(q.revenue);
      return s + (isNaN(r) ? 0 : r);
    }, 0);

    // EV from enterprise-values endpoint
    let ev = null;
    if (Array.isArray(evData) && evData.length > 0) {
      ev = parseFloat(evData[0].enterpriseValue);
      if (isNaN(ev)) ev = null;
    }

    // Fallback: compute EV from profile (marketCap + totalDebt - cashAndEquivalents)
    if (ev === null && Array.isArray(profile) && profile.length > 0) {
      const p = profile[0];
      const mktCap = parseFloat(p.mktCap);
      ev = isNaN(mktCap) ? null : mktCap;
    }

    const name = (Array.isArray(profile) && profile[0]?.companyName) || income[0]?.symbol || ticker;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        name,
        revenue: ttmRevenue || null,
        ev: ev || null
      })
    };

  } catch(e) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: e.message })
    };
  }
};
