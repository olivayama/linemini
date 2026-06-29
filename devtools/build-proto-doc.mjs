// Usage: node devtools/build-proto-doc.mjs docs/proto.json docs/proto

import path from 'node:path';
import fs from "node:fs";
import fsPromises from "node:fs/promises";

// TODO(dev-design): enum/map/oneof は未対応なので必要になった時に対応する。

const lookup = (fullName) => {
  for (const file of parsed.files) {
    for (const message of file.messages) {
      if (message.fullName === fullName) {
        return message
      }
    }
  }
}

const json = await fsPromises.readFile(process.argv[2])
const parsed = JSON.parse(json)

for (const file of parsed.files) {
  if (file.services.length > 0) {
    for (const service of file.services) {
      const referencedMessages = new Set()

      const w = fs.createWriteStream(path.join(process.argv[3], `${service.fullName}.md`))
      w.write(`# ${service.name}\n\n`)
      for (const method of service.methods) {
        w.write(`## ${method.name}\n\n`)
        w.write(`${method.description.replace(/@throws/, '- **@throws**').replace(`\n`, '  \n')}\n\n`)

        const requestType = file.messages.find(m => m.name === method.requestType)
        const responseType = file.messages.find(m => m.name === method.responseType)

        w.write(`### Request\n\n`)
        w.write(`|Name|Type|Label|Description|\n`)
        w.write(`|-|-|-|-|\n`)
        for (const field of requestType.fields) {
          if (lookup(field.fullType)) {
            referencedMessages.add(field.fullType)
            w.write(`|${field.name}|[${field.type}](#${field.fullType.toLowerCase().replace('.', '')})|${field.label}|${field.description}|\n`)
          } else {
            w.write(`|${field.name}|${field.type}|${field.label}|${field.description}|\n`)
          }
        }
        w.write('\n')
        w.write(`### Response\n\n`)
        w.write(`|Name|Type|Label|Description|\n`)
        w.write(`|-|-|-|-|\n`)
        for (const field of responseType.fields) {
          if (lookup(field.fullType)) {
            referencedMessages.add(field.fullType)
            w.write(`|${field.name}|[${field.type}](#${field.fullType.toLowerCase().replace('.', '')})|${field.label}|${field.description}|\n`)
          } else {
            w.write(`|${field.name}|${field.type}|${field.label}|${field.description}|\n`)
          }
        }
        w.write('\n')
      }

      
      if (referencedMessages.size > 0) {
        w.write(`# Messages\n\n`)
      }
      while (referencedMessages.size > 0) {
        for (const file of parsed.files) {
          for (const message of file.messages) {
            if (referencedMessages.has(message.fullName)) {
              referencedMessages.delete(message.fullName)
              w.write(`## ${message.fullName}\n\n`)
              w.write(`|Name|Type|Label|Description|\n`)
              w.write(`|-|-|-|-|\n`)
              for (const field of message.fields) {
                if (lookup(field.fullType)) {
                  referencedMessages.add(field.fullType)
                  w.write(`|${field.name}|[${field.type}](#${field.fullType.toLowerCase().replace('.', '')})|${field.label}|${field.description}|\n`)
                } else {
                  w.write(`|${field.name}|${field.type}|${field.label}|${field.description}|\n`)
                }
              }
              w.write('\n')
            }
          }
        }
      }
    }
  }
}


const w = fs.createWriteStream(path.join(process.argv[3], `README.md`))
w.write(`# Services\n\n`)
for (const file of parsed.files) {
  for (const service of file.services) {
    w.write(`- [${service.fullName}](./${service.fullName}.md)\n`)
  }
}
w.write('\n')

w.write(`# Scalars\n\n`)
w.write(`|Name|Type|Label|Description|\n`)
w.write(`|-|-|-|-|\n`)
for (const scalar of parsed.scalarValueTypes) {
  w.write(`|${scalar.protoType}|${scalar.notes}|\n`)
}
w.write('\n')
