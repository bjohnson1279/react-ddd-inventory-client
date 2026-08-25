const conformanceResults = [
    { module: 'Inventory CRUD', graphql: { pass: 24, fail: 0, skip: 0 }, express: { pass: 24, fail: 0, skip: 0 }, php: { pass: 23, fail: 1, skip: 0 } },
    { module: 'Accounting Ledger', graphql: { pass: 15, fail: 0, skip: 0 }, express: { pass: 15, fail: 0, skip: 0 }, php: { pass: 15, fail: 0, skip: 0 } },
    { module: 'Compliance Rules', graphql: { pass: 10, fail: 0, skip: 0 }, express: { pass: 10, fail: 0, skip: 0 }, php: { pass: 9, fail: 0, skip: 1 } },
  ];

  const totalStats = conformanceResults.reduce(
    (acc, cur) => {
      acc.total += 3 * (cur.graphql.pass + cur.graphql.fail + cur.graphql.skip);
      acc.pass += cur.graphql.pass + cur.express.pass + cur.php.pass;
      acc.fail += cur.graphql.fail + cur.express.fail + cur.php.fail;
      acc.skip += cur.graphql.skip + cur.express.skip + cur.php.skip;
      return acc;
    },
    { total: 0, pass: 0, fail: 0, skip: 0 }
  );

  console.log(totalStats);
