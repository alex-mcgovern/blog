import type { KnipConfig } from 'knip';

const config: KnipConfig = {
    entry: ['src'],
    ignore: ['dist'],
    project: ['src/**/*.{js,jsx,ts,tsx}'],
};

export default config;
