import {
  InterfaceDeclaration,
  ModuleDeclarationKind,
  Project,
  TypeAliasDeclaration,
} from "ts-morph";
import minimist from "minimist";
import path from "path";

type CliOptions = {
  file: string;
  outFile: string;
  type: string;
};

async function rewrite(options: CliOptions): Promise<void> {
  const project = new Project({});
  const source = project.addSourceFileAtPath(options.file);
  const jsonType = source.getTypeAlias("Json");
  let jsonColumns: InterfaceDeclaration | undefined;
  if (jsonType) {
    const jsonColumnsSource = project.addSourceFileAtPath(
      path.join(path.dirname(options.file), "json-columns.d.ts")
    );
    jsonColumns = jsonColumnsSource.getInterfaceOrThrow("JsonColumns");

    // replace Json type to fit dev design arch
    jsonType.remove();
    source.addImportDeclaration({
      moduleSpecifier: "./json-columns",
      namedImports: ["JsonColumns"],
    });
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: "kysely",
      namedImports: ["Expression"],
    });
  }
  const globalModule = source.addModule({
    name: "global",
    declarationKind: ModuleDeclarationKind.Global,
  });
  globalModule.setHasDeclareKeyword(true);
  const databaseInterface = source.getInterface(options.type);
  if (databaseInterface == null) {
    throw new Error(`Cannot find interface ${options.type}`);
  }
  if (databaseInterface) {
    const tables = databaseInterface.getProperties();
    tables.forEach((table) => {
      const typeNode = table.getTypeNode();
      const typeName = typeNode?.getText() ?? "";
      const tableInterface = source.getInterface(typeName);
      if (!tableInterface) {
        throw new Error(`Cannot find interface ${tableInterface}`);
      }
      tableInterface.getProperties().forEach((property) => {
        const propTypeNode = property.getTypeNode();
        if (propTypeNode) {
          const key = `${table.getName()}__${property.getName()}`;
          if (jsonColumns) {
            const prop = jsonColumns.getProperties().find((prop) => {
              return prop.getName() === key;
            });
            if (prop) {
              propTypeNode.replaceWithText(
                `ColumnType<JsonColumns['${key}'], Expression<JsonValue>, Expression<JsonValue>>`
              );
            }
          }
        }
      });
      tableInterface.rename(typeName + "Table");
      globalModule.addInterface(tableInterface.getStructure());
      tableInterface.remove();
    });
    globalModule.addInterface(databaseInterface.getStructure());
    databaseInterface.remove();
  }

  await project.save();
}

function parseOptions(args: string[]): CliOptions {
  const argv = minimist(args);

  const _: string[] = argv._;
  const file = argv["file"] as string | undefined;
  if (!file) throw new Error("`--file` option is required.");

  const type = argv["type"] as string | undefined;
  if (!type) throw new Error("`--type` option is required.");

  const outFile = argv["out-file"] as string | undefined;
  if (!outFile) throw new Error("`--out-file` option is required.");

  return {
    outFile,
    file,
    type,
  };
}

const options = parseOptions(process.argv.slice(2));
rewrite(options).catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
});
