const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
async function test() {
  const query = `
    query {
      user(where: {login: {_eq: "abouzerd"}}) {
        id
        login
        attrs
        transactions(
          where: {
            type: { _eq: "xp" }
            path: { _nlike: "%piscine%" }
          }
          order_by: { createdAt: desc }
        ) {
          amount
          path
          createdAt
        }
      }
    }
  `;
  const res = await fetch("https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  console.log(JSON.stringify(await res.json(), null, 2));
}
test();
