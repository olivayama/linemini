$.verbose = false;

const commentPrefix = "// ";

try {
  // buf build でも同じことが出来るが、buf build の場合は stdout ではなく stderr に出力される
  await $`pnpm exec buf lint --error-format json`;
} catch (p) {
  const aggErrors = p.stdout.split("\n").reduce((acc, line) => {
    if (line === "") return acc;
    const error = JSON.parse(line);
    if (acc[error.path] == null) {
      acc[error.path] = [];
    }
    acc[error.path].push(error);
    return acc;
  }, {});

  for (const [path, errors] of Object.entries(aggErrors)) {
    console.log(`${path}\n\n`);

    for (const error of errors) {
      if (/unknown request|response type/.test(error.message)) {
        const t = error.message.split(" ").pop();
        if (t.endsWith("Request")) {
          console.log(`${commentPrefix}${t.replace("Request", "")}\n`);
        }
        console.log(`message ${t} {}\n`);
      }
    }
  }
}
