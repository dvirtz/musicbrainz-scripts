import scriptConfig from '../../rollup.userscript.config.mjs';
import pkg from './package.json' with {type: 'json'};

export default scriptConfig(pkg.name.replace(/@.*\//, ''));
