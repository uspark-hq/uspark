const apiKey = "e2b_91091007ecaff3872a5afa22d097af28c3732925";

// Try to make a simple API call to E2B
fetch("https://api.e2b.dev/v1/templates", {
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
  },
})
  .then((res) => {
    console.log("Status:", res.status);
    return res.text();
  })
  .then((body) => {
    console.log("Response:", body);
  })
  .catch((err) => {
    console.error("Error:", err);
  });
