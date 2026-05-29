fetch("https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "{ user(where: {login: {_eq: \"abouzerd\"}}) { attrs } }" })
}).then(async r => {
  const text = await r.text();
  console.log("Response:", r.status, text);
}).catch(console.error);
