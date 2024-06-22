const webpack = require('webpack')
const path = require('path');
const fs = require('fs');
const TerserPlugin = require('terser-webpack-plugin');
const DtsBundler = require('dts-bundle-generator');

// -----------------------------------------------------------------------------

module.exports = {
	mode: 'production',
	target: 'web',
	entry: './src/index.ts',
	output: {
		filename: 'msgpack.min.js',
		path: path.resolve(__dirname, 'dist'),
		library: 'MsgPack',
		libraryTarget: 'umd',
		globalObject: 'this'
	},
	module: {
		rules: [
			{
				test: /\.ts$/u,
				include: path.resolve(__dirname, 'src'),
				use: [
					{
						loader: 'ts-loader'
					}
				]
			}
		]
	},
	resolve: {
		extensions: [ '.ts', '.js' ],
		fallback: {
//			'node:buffer': require.resolve('buffer/'),
		}
	},
	devtool: 'source-map',
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				extractComments: true,
				terserOptions: {
					ecma: 2020
				}
			})
		]
	},
	plugins: [
		new DtsBundlerPlugin(),
		new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
			const mod = resource.request.replace(/^node:/, '');
			switch (mod) {
				case "buffer":
					resource.request = 'buffer/';
					break;
				default:
					throw new Error(`Not found ${mod}`);
			}
		})
	]
};

// -----------------------------------------------------------------------------

function DtsBundlerPlugin() {
}

DtsBundlerPlugin.prototype.apply = function(compiler) {
	compiler.hooks.afterEmit.tap(
		'DtsBundlerPlugin',
		(compilation) => {
			if (compilation.options.entry.main.import.length > 0) {
				const output = DtsBundler.generateDtsBundle([
					{
						filePath: compilation.options.entry.main.import[0],
						output: {
							umdModuleName: 'MsgPack',
							noBanner: true
						}
					}
				], {});

				fs.writeFileSync(path.resolve(path.join(compilation.options.output.path, 'msgpack.min.d.ts')), output[0]);
			}
		}
	);
};
