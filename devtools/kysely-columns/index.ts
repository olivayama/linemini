import * as fs from "fs";
import * as ts from "typescript";
import minimist from "minimist";

type Types = {
  [key: string]: string;
};

function findTypes(sourceFile: ts.SourceFile, type: string): Types {
  const types: Types = {};

  const traverse = (node: ts.Node) => {
    const next = () => {
      ts.forEachChild(node, traverse);
    };

    switch (node.kind) {
      case ts.SyntaxKind.InterfaceDeclaration:
        const interfaceNode = node as ts.InterfaceDeclaration;
        const name = interfaceNode.name.getText();
        if (name !== type) break;

        interfaceNode.members.forEach((member) => {
          if (member.kind === ts.SyntaxKind.PropertySignature) {
            const propertyNode = member as ts.PropertySignature;
            if (propertyNode.type) {
              types[propertyNode.type.getText()] = propertyNode.name.getText();
            }
          }
        });
        break;
      default:
        next();
    }
  };

  ts.forEachChild(sourceFile, (node) => {
    traverse(node);
  });

  return types;
}

type Columns = {
  name: string;
  columns: string[];
};

function serialize(columns: Columns[]): string {
  let data = "export const columns = { ";

  columns.forEach((col) => {
    data += `${col.name}: [`;

    col.columns.forEach((column, index) => {
      data += `'${column}'`;

      if (index !== col.columns.length - 1) {
        data += ", ";
      }
    });

    data += `], `;
  });

  data += " } as const";

  return data;
}

type CliOptions = {
  file: string;
  type: string;
  outFile: string;
};

function generate(options: CliOptions): string {
  let data: string = "";

  if (!fs.existsSync(options.file)) {
    throw new Error(`${options.file} does not exist.`);
  }

  const sourceFile = ts.createSourceFile(
    options.file,
    fs.readFileSync(options.file).toString(),
    ts.ScriptTarget.ES2018,
    true
  );

  const types = findTypes(sourceFile, options.type);
  if (Object.keys(types).length === 0) {
    throw new Error(`${options.type} type not found.`);
  }

  const columns: Columns[] = [];

  const traverse = (node: ts.Node, types: Types) => {
    const next = () => {
      ts.forEachChild(node, (node) => {
        traverse(node, types);
      });
    };

    switch (node.kind) {
      case ts.SyntaxKind.InterfaceDeclaration:
        const interfaceNode = node as ts.InterfaceDeclaration;
        const interfaceName = interfaceNode.name.getText();
        if (types[interfaceName]) {
          const name = types[interfaceName];

          let cols: string[] = [];
          // プロパティの情報を取得
          interfaceNode.members.forEach((member) => {
            if (member.kind === ts.SyntaxKind.PropertySignature) {
              const propertyNode = member as ts.PropertySignature;
              const col = propertyNode.name.getText();
              cols.push(col);
            }
          });

          columns.push({ name, columns: cols });
        }
        break;
      default:
        next();
    }
  };

  ts.forEachChild(sourceFile, (node) => {
    traverse(node, types);
  });

  if (columns.length > 0) {
    data = serialize(columns);
  }

  return data;
}

function parseOptions(args: string[]): CliOptions {
  const argv = minimist(args);

  const _: string[] = argv._;
  const file = argv["file"] as string | undefined;
  if (!file) throw new Error("`--file` option is required.");

  const outFile = argv["out-file"] as string | undefined;
  if (!outFile) throw new Error("`--out-file` option is required.");

  const type = argv["type"] as string | undefined;
  if (!type) throw new Error("`--type` option is required.");

  return {
    file,
    type,
    outFile,
  };
}

try {
  const options = parseOptions(process.argv.slice(2));
  const columns = generate(options);
  fs.writeFileSync(options.outFile, columns);
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(0);
}
