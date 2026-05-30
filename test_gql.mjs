const query = `
  query {
    user(where: {login: {_eq: "abouzerd"}}) {
      attrs
    }
  }
`;
const res = await fetch("https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query })
});
console.log(JSON.stringify(await res.json(), null, 2));
