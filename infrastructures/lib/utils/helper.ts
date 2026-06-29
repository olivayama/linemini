// vpcCidr: 10.10.0.0/16, relativeSubmit: x.x.0.0/22 -> 10.10.0.0/22
export const absoluteSubnet = (
  vpcCidr: string,
  relativeSubnet: string
): string => {
  const [a, b] = vpcCidr.split(".");
  return relativeSubnet.replace(/^x\.x/, `${a}.${b}`);
};

export const toCapitalized = (s: string): string => {
  return s
    .split("_")
    .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
    .join("");
};
