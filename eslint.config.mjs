import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "lib/prisma/generated/**",
      "prisma/migrations/**",
    ],
  },
];

export default eslintConfig;
