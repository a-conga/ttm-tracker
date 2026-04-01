exports.handler = async function(event) {
  const ticker = event.queryStringParameters?.ticker;
  if (!ticker) return { statusCode: 400, body: JSON.stringify({ error: "No ticker" }) };

  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const quoteUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=financialData,defaultKeyStatistics,incomeStatementHistory`;

    const res = await fetch(quoteUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://finance.yahoo.com"
      }
    });

    const data = await res.json();

    if (!data?.quoteSummary?.result?.[0]) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: "No Yahoo data for " + ticker }) };
    }

    const result = data.quoteSummary.result[0];
    const fin = result.financialData;
    const stats = result.defaultKeyStatistics;

    // TTM Revenue from financialData
    const revenue = fin?.totalRevenue?.raw ?? null;

    // Enterprise Value from defaultKeyStatistics
    const ev = stats?.enterpriseValue?.raw ?? null;

    // Company name — fetch from quote endpoint
    const nameRes = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${ticker}&quotesCount=1`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const nameData = await nameRes.json();
    const name = nameData?.quotes?.[0]?.longname || nameData?.quotes?.[0]?.shortname || ticker;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ name, revenue, ev })
    };

  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
