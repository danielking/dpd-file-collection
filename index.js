var Collection = require('deployd/lib/resources/collection')
	_ = require('underscore')
	, util = require('util');
var lwip = require('lwip');

function FileCollection(name, options) {
	Collection.apply(this, arguments);
	var config = this.config;
	if(!this.properties) {
		this.properties = {};
	}

	this.properties.name = this.properties.name || {type: 'string'};
	this.properties.name.required = true;
	this.properties.type = this.properties.type || {type: 'string'};
	this.properties.type.required = true;
	this.properties.size = this.properties.size || {type: 'number'};
	this.properties.size.required = true;
	this.properties.data = this.properties.data || {type: 'string'};
	this.properties.data.required = true;
}

util.inherits(FileCollection, Collection);
FileCollection.dashboard = Collection.dashboard;
FileCollection.events    = _.clone(Collection.events);

FileCollection.label = 'Files Collection';
FileCollection.defaultPath = '/files';

FileCollection.prototype.handle = function(ctx) {
	var id = this.parseId(ctx)
	var self = this;
	if(ctx.method == 'GET' && id && ctx.query.hasOwnProperty('file')) {
		self.store.find({id: id}, function(err, item) {
			if(err || !item) {
				ctx.done(404);
			} else {
				ctx.res.setHeader('Content-Type', item.type);
				ctx.res.setHeader('Content-Length', item.size);
				var data = item.data;
				if(item.type.match(/^image\//) && ctx.query.hasOwnProperty('thumbnail')) {
					if(item.thumbnail) {
						var buffer = new Buffer(item.thumbnail, 'base64');
						ctx.res.setHeader('Content-Type', 'image/jpeg');
						ctx.res.setHeader('Content-Length', buffer.length);
						ctx.res.end(buffer);
					} else {
						var buffer = new Buffer(item.data, 'base64');
						lwip.open(buffer, item.type.slice(6), function(err, image){
							image.cover(400, 280, 'lanczos', function(err, newImage) {
								newImage.toBuffer('jpg', {quality: 75}, function(err, newBuffer) {
									var s = newBuffer.toString('base64');
									self.store.update({id: item.id}, {thumbnail: s}, function(err, updated) {
										console.log(arguments);
									});
									ctx.res.setHeader('Content-Type', 'image/jpeg');
									ctx.res.setHeader('Content-Length', newBuffer.length);
									ctx.res.end(newBuffer);
								});
							});
						});

					}
				} else {
					ctx.res.end(new Buffer(data, 'base64'));
				}
			}
		});
	} else {
		return Collection.prototype.handle.apply(this, arguments);
	}
};

module.exports = FileCollection;
