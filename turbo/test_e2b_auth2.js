const apiKey = 'e2b_91091007ecaff3872a5afa22d097af28c3732925';

// Try the sandboxes endpoint
fetch('https://api.e2b.dev/sandboxes', {
  headers: {
    'X-API-Key': apiKey,
  }
})
.then(res => {
  console.log('Status:', res.status);
  return res.text();
})
.then(body => {
  console.log('Response:', body);
})
.catch(err => {
  console.error('Error:', err);
});
