# Scalars

|          |                                                                                                                                                 |     |     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- |
| double   |                                                                                                                                                 |
| float    |                                                                                                                                                 |
| int32    | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint32 instead. |
| int64    | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint64 instead. |
| uint32   | Uses variable-length encoding.                                                                                                                  |
| uint64   | Uses variable-length encoding.                                                                                                                  |
| sint32   | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int32s.                            |
| sint64   | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int64s.                            |
| fixed32  | Always four bytes. More efficient than uint32 if values are often greater than 2^28.                                                            |
| fixed64  | Always eight bytes. More efficient than uint64 if values are often greater than 2^56.                                                           |
| sfixed32 | Always four bytes.                                                                                                                              |
| sfixed64 | Always eight bytes.                                                                                                                             |
| bool     |                                                                                                                                                 |
| string   | A string must always contain UTF-8 encoded or 7-bit ASCII text.                                                                                 |
| bytes    | May contain any arbitrary sequence of bytes.                                                                                                    |
