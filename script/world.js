var World = {
	
	RADIUS: 30,
	VILLAGE_POS: [30, 30],
	TILE: {
		VILLAGE: 'A',
		IRON_MINE: 'I',
		COAL_MINE: 'C',
		SULPHUR_MINE: 'S',
		FOREST: ';',
		FIELD: ',',
		BARRENS: '.',
		ROAD: '#',
		HOUSE: 'H',
		CAVE: 'V',
		TOWN: 'O',
		CITY: 'Y',
		OUTPOST: 'P',
		SHIP: 'W',
		BOREHOLE: 'B',
		BATTLEFIELD: 'F',
		SWAMP: 'M',
    CACHE: 'U'
	},
	TILE_PROBS: {},
	LANDMARKS: {},
	STICKINESS: 0.5, // 0 <= x <= 1
	LIGHT_RADIUS: 2,
	BASE_WATER: 10,
	MOVES_PER_FOOD: 2,
	MOVES_PER_WATER: 1,
	DEATH_COOLDOWN: 120,
	FIGHT_CHANCE: 0.20,
	BASE_HEALTH: 10,
	BASE_HIT_CHANCE: 0.8,
	MEAT_HEAL: 8,
	MEDS_HEAL: 20,
	FIGHT_DELAY: 3, // At least three moves between fights
	NORTH: [ 0, -1],
	SOUTH: [ 0,  1],
	WEST:  [-1,  0],
	EAST:  [ 1,  0],
	
	Weapons: {
		'拳头': {
			verb: '拳击',
			type: 'unarmed',
			damage: 1,
			cooldown: 2
		},
		'骨枪': {
			verb: '戳击',
			type: 'melee',
			damage: 2,
			cooldown: 2
		},
		'铁剑': {
			verb: '挥舞',
			type: 'melee',
			damage: 4,
			cooldown: 2
		},
		'钢剑': {
			verb: '砍劈',
			type: 'melee',
			damage: 6,
			cooldown: 2
		},
		'刺刀': {
			verb: '猛刺',
			type: 'melee',
			damage: 8,
			cooldown: 2
		},
		'步枪': {
			verb: '开火',
			type: 'ranged',
			damage: 5,
			cooldown: 1,
			cost: { '子弹': 1 }
		},
		'激光枪': {
			verb: '发射',
			type: 'ranged',
			damage: 8,
			cooldown: 1,
			cost: { '能量元件': 1 }
		},
		'手雷': {
			verb: '掷弹',
			type: 'ranged',
			damage: 15,
			cooldown: 5,
			cost: { '手雷': 1 }
		},
		'套索': {
			verb: '牵绊',
			type: 'ranged',
			damage: 'stun',
			cooldown: 15,
			cost: { '套索': 1 }
		}
	},
	
	name: 'World',
	options: {}, // Nothing for now
	init: function(options) {
		this.options = $.extend(
			this.options,
			options
		);
		
		// Setup probabilities. Sum must equal 1.
		World.TILE_PROBS[World.TILE.FOREST] = 0.15;
		World.TILE_PROBS[World.TILE.FIELD] = 0.35;
		World.TILE_PROBS[World.TILE.BARRENS] = 0.5;
		
		// Setpiece definitions
		World.LANDMARKS[World.TILE.OUTPOST] = { num: 0, minRadius: 0, maxRadius: 0, scene: '前哨', label: '前哨' };
		World.LANDMARKS[World.TILE.IRON_MINE] = { num: 1, minRadius: 5, maxRadius: 5, scene: '铁矿', label: '铁矿' };
		World.LANDMARKS[World.TILE.COAL_MINE] = { num: 1, minRadius: 10, maxRadius: 10, scene: '煤矿', label: '煤矿' };
		World.LANDMARKS[World.TILE.SULPHUR_MINE] = { num: 1, minRadius: 20, maxRadius: 20, scene: '硫磺矿', label: '硫磺矿' };
		World.LANDMARKS[World.TILE.HOUSE] = { num: 10, minRadius: 0, maxRadius: World.RADIUS * 1.5, scene: '老屋', label: '破旧宅邸' };
		World.LANDMARKS[World.TILE.CAVE] = { num: 5, minRadius: 3, maxRadius: 10, scene: '洞穴', label: '潮湿洞穴' };
		World.LANDMARKS[World.TILE.TOWN] = { num: 10, minRadius: 10, maxRadius: 20, scene: '小镇', label: '废弃小镇' };
		World.LANDMARKS[World.TILE.CITY] = { num: 20, minRadius: 20, maxRadius: World.RADIUS * 1.5, scene: '城市', label: '城市遗迹' };
		World.LANDMARKS[World.TILE.SHIP] = { num: 1, minRadius: 28, maxRadius: 28, scene: '飞船', label: '失事飞船'};
		World.LANDMARKS[World.TILE.BOREHOLE] = { num: 10, minRadius: 15, maxRadius: World.RADIUS * 1.5, scene: '巨坑', label: '巨坑'};
		World.LANDMARKS[World.TILE.BATTLEFIELD] = { num: 5, minRadius: 18, maxRadius: World.RADIUS * 1.5, scene: '战场', label: '战场'};
		World.LANDMARKS[World.TILE.SWAMP] = { num: 1, minRadius: 15, maxRadius: World.RADIUS * 1.5, scene: '沼泽', label: '迷雾沼泽'};
		
		// Only add the cache if there is prestige data
		if($SM.get('previous.stores')) {
    			World.LANDMARKS[World.TILE.CACHE] = { num: 1, minRadius: 10, maxRadius: World.RADIUS * 1.5, scene: '临时', label: '荒原'};
		}
		
		if(typeof $SM.get('features.location.world') == 'undefined') {
			$SM.set('features.location.world', true);
			$SM.setM('game.world', {
				map: World.generateMap(),
				mask: World.newMask()
			});
		}
		
		// Create the World panel
		this.panel = $('<div>').attr('id', "worldPanel").addClass('location').appendTo('#outerSlider');
		
		// Create the shrink wrapper
		var outer = $('<div>').attr('id', 'worldOuter').appendTo(this.panel);
		
		// Create the bag panel
		$('<div>').attr('id', 'bagspace-world').append($('<div>')).appendTo(outer);
		$('<div>').attr('id', 'backpackTitle').appendTo(outer);
		$('<div>').attr('id', 'backpackSpace').appendTo(outer);
		$('<div>').attr('id', 'healthCounter').appendTo(outer);
		
		Engine.updateOuterSlider();
		
		//subscribe to stateUpdates
		$.Dispatch('stateUpdate').subscribe(World.handleStateUpdates);
	},
	
	clearDungeon: function() {
		Engine.event('progress', 'dungeon cleared');
		World.state.map[World.curPos[0]][World.curPos[1]] = World.TILE.OUTPOST;
		World.drawRoad();
	},
	
	drawRoad: function() {
		var findClosestRoad = function(startPos) {
			// We'll search in a spiral to find the closest road tile
			// We spiral out along manhattan distance contour
			// lines to ensure we draw the shortest road possible.
			// No attempt is made to reduce the search space for
			// tiles outside the map.
			var searchX, searchY, dtmp,
				x = 0,
				y = 0,
				dx = 1,
				dy = -1;
			for (var i = 0; i < Math.pow(World.getDistance(startPos, World.VILLAGE_POS) + 2, 2); i++) {
				searchX = startPos[0] + x;
				searchY = startPos[1] + y;
				if (0 < searchX && searchX < World.RADIUS * 2 && 0 < searchY && searchY < World.RADIUS * 2) {
					// check for road
					var tile = World.state.map[searchX][searchY];
					if (
					 	tile === World.TILE.ROAD ||
						(tile === World.TILE.OUTPOST && !(x === 0 && y === 0))  || // outposts are connected to roads
						tile === World.TILE.VILLAGE // all roads lead home
					 ) {
						return [searchX, searchY];
					}
				}
				if (x === 0 || y === 0) {
					// Turn the corner
					dtmp = dx;
					dx = -dy;
					dy =  dtmp;
				}
				if (x === 0 && y <= 0) {
					x++;
				} else {
					x += dx;
					y += dy;
				}
			}
			return World.VILLAGE_POS;
		};
		var closestRoad = findClosestRoad(World.curPos);
		var xDist = World.curPos[0] - closestRoad[0];
		var yDist = World.curPos[1] - closestRoad[1];
		var xDir = Math.abs(xDist)/xDist;
		var yDir = Math.abs(yDist)/yDist;
		var xIntersect, yIntersect;
		if(Math.abs(xDist) > Math.abs(yDist)) {
			xIntersect = closestRoad[0];
			yIntersect = closestRoad[1] + yDist;
		} else {
			xIntersect = closestRoad[0] + xDist;
			yIntersect = closestRoad[1];
		}
		
		for(var x = 0; x < Math.abs(xDist); x++) {
			if(World.isTerrain(World.state.map[closestRoad[0] + (xDir*x)][yIntersect])) {
				World.state.map[closestRoad[0] + (xDir*x)][yIntersect] = World.TILE.ROAD;
			}
		}
		for(var y = 0; y < Math.abs(yDist); y++) {
			if(World.isTerrain(World.state.map[xIntersect][closestRoad[1] + (yDir*y)])) {
				World.state.map[xIntersect][closestRoad[1] + (yDir*y)] = World.TILE.ROAD;
			}
		}
		World.drawMap();
	},
	
	updateSupplies: function() {
		var supplies = $('div#bagspace-world > div');
		
		if(!Path.outfit) {
			Path.outfit = {};
		}
		
		// Add water
		var water = $('div#supply_water');
		if(World.water > 0 && water.length == 0) {
			water = World.createItemDiv('water', World.water);
			water.prependTo(supplies);
		} else if(World.water > 0) {
			$('div#supply_water', supplies).text('水:' + World.water);
		} else {
			water.remove();
		}
		
		var total = 0;
		for(var k in Path.outfit) {
			var item = $('div#supply_' + k.replace(' ', '-'), supplies);
			var num = Path.outfit[k];
			total += num * Path.getWeight(k);
			if(num > 0 && item.length == 0) {
				item = World.createItemDiv(k, num);
				if(k == '熏肉' && World.water > 0) {
					item.insertAfter(water);
				} else if(k == '熏肉') {
					item.prependTo(supplies);
				} else {
					item.appendTo(supplies);
				}
			} else if(num > 0) {
				$('div#' + item.attr('id'), supplies).text(k + ':' + num);
			} else {
				item.remove();
			}
		}
		
		// Update label
		var t = 'pockets';
		if($SM.get('stores["双肩包"]', true) > 0) {
			t = '双肩包';
		}
		$('#backpackTitle').text(t);
		
		// Update bagspace
		$('#backpackSpace').text('背包空间' + Math.floor(Path.getCapacity() - total) + '/' + Path.getCapacity());
	},
	
	setWater: function(w) {
		World.water = w;
		if(World.water > World.getMaxWater()) {
			World.water = World.getMaxWater();
		}
		World.updateSupplies();
	},
	
	setHp: function(hp) {
		if(typeof hp == 'number' && !isNaN(hp)) {
			World.health = hp;
			if(World.health > World.getMaxHealth()) {
				World.health = World.getMaxHealth();
			}
			$('#healthCounter').text('hp: ' + World.health + '/' + World.getMaxHealth());
		}
	},
	
	createItemDiv: function(name, num) {
		var div = $('<div>').attr('id', 'supply_' + name.replace(' ', '-'))
			.addClass('supplyItem')
			.text(name + ':' + num);
		
		return div;
	},
	
	moveNorth: function() {
		Engine.log('North');
		if(World.curPos[1] > 0) World.move(World.NORTH);
	},
	
	moveSouth: function() {
		Engine.log('South');
		if(World.curPos[1] < World.RADIUS * 2) World.move(World.SOUTH);
	},
	
	moveWest: function() {
		Engine.log('West');
		if(World.curPos[0] > 0) World.move(World.WEST);
	},
	
	moveEast: function() {
		Engine.log('East');
		if(World.curPos[0] < World.RADIUS * 2) World.move(World.EAST);
	},
	
	move: function(direction) {
		var oldTile = World.state.map[World.curPos[0]][World.curPos[1]];
		World.curPos[0] += direction[0];
		World.curPos[1] += direction[1];
		World.narrateMove(oldTile, World.state.map[World.curPos[0]][World.curPos[1]]);
		World.lightMap(World.curPos[0], World.curPos[1], World.state.mask);
		World.drawMap();
		World.doSpace();
		if(World.checkDanger()) {
			if(World.danger) {
				Notifications.notify(World, '没有妥善防护离开村子这么远很危险');
			} else {
				Notifications.notify(World, '总算安全了');
			}
		}
	},
	
	keyDown: function(event) {
		switch(event.which) {
			case 38: // Up
			case 87:
				World.moveNorth();
				break;
			case 40: // Down
			case 83:
				World.moveSouth();
				break;
			case 37: // Left
			case 65:
				World.moveWest();
				break;
			case 39: // Right
			case 68:
				World.moveEast();
				break;
			default:
				break;
		}
	},

	swipeLeft: function(e) {
		World.moveWest();
	},

	swipeRight: function(e) {
		World.moveEast();
	},

	swipeUp: function(e) {
		World.moveNorth();
	},

	swipeDown: function(e) {
		World.moveSouth();
	},

	click: function(event) {
		var map = $('#map'),
			// measure clicks relative to the centre of the current location
			centreX = map.offset().left + map.width() * World.curPos[0] / (World.RADIUS * 2),
			centreY = map.offset().top + map.height() * World.curPos[1] / (World.RADIUS * 2),
			clickX = event.pageX - centreX,
			clickY = event.pageY - centreY;
		if (clickX > clickY && clickX < -clickY) {
			World.moveNorth();
		}
		if (clickX < clickY && clickX > -clickY) {
			World.moveSouth();
		}
		if (clickX < clickY && clickX < -clickY) {
			World.moveWest();
		}
		if (clickX > clickY && clickX > -clickY) {
			World.moveEast();
		}
	},
	
	checkDanger: function() {
		World.danger = typeof World.danger == 'undefined' ? false: World.danger;
		if(!World.danger) {
			if(!$SM.get('stores["铁甲"]', true) > 0 && World.getDistance() >= 8) {
				World.danger = true;
				return true;
			} 
			if(!$SM.get('stores["钢甲"]', true) > 0 && World.getDistance() >= 18) {
				World.danger = true;
				return true;
			}
		} else {
			if(World.getDistance() < 8) {
				World.danger = false;
				return true;
			}
			if(World.getDistance < 18 && $SM.get('stores["铁甲"]', true) > 0) {
				World.danger = false;
				return true;
			}
		}
		return false;
	},
	
	useSupplies: function() {
		World.foodMove++;
		World.waterMove++;
		// Food
		var movesPerFood = World.MOVES_PER_FOOD;
		movesPerFood *= $SM.hasPerk('slow metabolism') ? 2 : 1;
		if(World.foodMove >= movesPerFood) {
			World.foodMove = 0;
			var num = Path.outfit['熏肉'];
			num--;
			if(num == 0) {
				Notifications.notify(World, '肉快要吃完了');
			} else if(num < 0) {
				// Starvation! Hooray!
				num = 0;
				if(!World.starvation) {
					Notifications.notify(World, '饥饿袭来');
					World.starvation = true;
				} else {
					$SM.set('character.starved', $SM.get('character.starved', true));
					$SM.add('character.starved', 1);
					if($SM.get('character.starved') >= 10 && !$SM.hasPerk('缓慢代谢')) {
						$SM.addPerk('缓慢代谢');
					}
					World.die();
					return false;
				}
			} else {
				World.starvation = false;
				World.setHp(World.health + World.meatHeal());
			}
			Path.outfit['熏肉'] = num;
		}
		// Water
		var movesPerWater = World.MOVES_PER_WATER;
		movesPerWater *= $SM.hasPerk('荒漠跳鼠') ? 2 : 1;
		if(World.waterMove >= movesPerWater) {
			World.waterMove = 0;
			var water = World.water;
			water--;
			if(water == 0) {
				Notifications.notify(World, '水耗尽了');
			} else if(water < 0) {
				water = 0;
				if(!World.thirst) {
					Notifications.notify(World, '口渴难耐');
					World.thirst = true;
				} else {
					$SM.set('character.dehydrated', $SM.get('character.dehydrated', true));
					$SM.add('character.dehydrated', 1);
					if($SM.get('character.dehydrated') >= 10 && !$SM.hasPerk('荒漠跳鼠')) {
						$SM.addPerk('荒漠跳鼠');
					}
					World.die();
					return false;
				}
			} else {
				World.thirst = false;
			}
			World.setWater(water);
			World.updateSupplies();
		}
		return true;
	},
	
	meatHeal: function() {
		return World.MEAT_HEAL * ($SM.hasPerk('美食家') ? 2 : 1);
	},
	
	medsHeal: function() {
		return World.MEDS_HEAL;
	},
	
	checkFight: function() {
		World.fightMove = typeof World.fightMove == 'number' ? World.fightMove : 0;
		World.fightMove++;
		if(World.fightMove > World.FIGHT_DELAY) {
			var chance = World.FIGHT_CHANCE;
			chance *= $SM.hasPerk('潜行') ? 0.5 : 1;
			if(Math.random() < chance) {
				World.fightMove = 0;
				Events.triggerFight();
			}
		}
	},
	
	doSpace: function() {
		var curTile = World.state.map[World.curPos[0]][World.curPos[1]];

		if(curTile == World.TILE.VILLAGE) {
			World.goHome();
		} else if(typeof World.LANDMARKS[curTile] != 'undefined') {
			if(curTile != World.TILE.OUTPOST || !World.outpostUsed()) {
				Events.startEvent(Events.Setpieces[World.LANDMARKS[curTile].scene]);
			}
		} else {
			if(World.useSupplies()) {
				World.checkFight();
			}
		}
	},
	
	getDistance: function(from, to) {
		from = from || World.curPos;
		to = to || World.VILLAGE_POS;
		return Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]);
	},
	
	getTerrain: function() {
		return World.state.map[World.curPos[0]][World.curPos[1]];
	},
	
	narrateMove: function(oldTile, newTile) {
		var msg = null;
		switch(oldTile) {
			case World.TILE.FOREST:
				switch(newTile) {
					case World.TILE.FIELD:
						msg = "树木歪倒在干草丛中，枯黄的灌木在风中沙沙作响.";
						break;
					case World.TILE.BARRENS:
						msg = "树木都消失了，唯留下干裂的大地和飞扬的尘土.";
						break;
				}
				break;
			case World.TILE.FIELD:
				switch(newTile) {
					case World.TILE.FOREST:
						msg = "地平线上隐约瞧见树林。草地渐渐稀疏，替代以铺着枯枝败叶的森林.";
						break;
					case World.TILE.BARRENS:
						msg = "草地很快稀疏了起来，唯留下漫天扬尘.";
						break;
				}
				break;
			case World.TILE.BARRENS:
				switch(newTile) {
					case World.TILE.FIELD:
						msg = "在燥热的风中摇曳，枯草之海中现出一片荒地.";
						break;
					case World.TILE.FOREST:
						msg = "尘土之中生长出结瘤的树墙，枝干在头顶缠绕成骨骼般的天蓬.";
						break;
				}
				break;
		}
		if(msg != null) {
			Notifications.notify(World, msg);
		}
	},
	
	newMask: function() {
		var mask = new Array(World.RADIUS * 2 + 1);
		for(var i = 0; i <= World.RADIUS * 2; i++) {
			mask[i] = new Array(World.RADIUS * 2 + 1);
		}
		World.lightMap(World.RADIUS, World.RADIUS, mask);
		return mask;
	},
	
	lightMap: function(x, y, mask) {
		var r = World.LIGHT_RADIUS;
		r *= $SM.hasPerk('侦察') ? 2 : 1;
		World.uncoverMap(x, y, r, mask);
		return mask;
	},
	
	uncoverMap: function(x, y, r, mask) {
		mask[x][y] = true;
		for(var i = -r; i <= r; i++) {
			for(var j = -r + Math.abs(i); j <= r - Math.abs(i); j++) {
				if(y + j >= 0 && y + j <= World.RADIUS * 2 && 
						x + i <= World.RADIUS * 2 && 
						x + i >= 0) {
					mask[x+i][y+j] = true;
				}
			}
		}
	},
	
	applyMap: function() {
		var x = Math.floor(Math.random() * (World.RADIUS * 2) + 1);
		var y = Math.floor(Math.random() * (World.RADIUS * 2) + 1);
		World.uncoverMap(x, y, 5, $SM.get('game.world.mask'));
	},
	
	generateMap: function() {
		var map = new Array(World.RADIUS * 2 + 1);
		for(var i = 0; i <= World.RADIUS * 2; i++) {
			map[i] = new Array(World.RADIUS * 2 + 1);
		}
		// The Village is always at the exact center
		// Spiral out from there
		map[World.RADIUS][World.RADIUS] = World.TILE.VILLAGE;
		for(var r = 1; r <= World.RADIUS; r++) {
			for(var t = 0; t < r * 8; t++) {
				var x, y;
				if(t < 2 * r) {
					x = World.RADIUS - r + t;
					y = World.RADIUS - r;
				} else if(t < 4 * r) {
					x = World.RADIUS + r;
					y = World.RADIUS - (3 * r) + t;
				} else if(t < 6 * r) {
					x = World.RADIUS + (5 * r) - t;
					y = World.RADIUS + r;
				} else {
					x = World.RADIUS - r;
					y = World.RADIUS + (7 * r) - t;
				}
				
				map[x][y] = World.chooseTile(x, y, map);
			}
		}
		
		// Place landmarks
		for(var k in World.LANDMARKS) {
			var landmark = World.LANDMARKS[k];
			for(var i = 0; i < landmark.num; i++) {
				var pos = World.placeLandmark(landmark.minRadius, landmark.maxRadius, k, map);
				if(k == World.TILE.SHIP) {
					var dx = pos[0] - World.RADIUS, dy = pos[1] - World.RADIUS;
					var horz = dx < 0 ? '西方' : '东方';
					var vert = dy < 0 ? '北方' : '南方';
					if(Math.abs(dx) / 2 > Math.abs(dy)) {
						World.dir = horz;
					} else if(Math.abs(dy) / 2 > Math.abs(dx)){
						World.dir = vert;
					} else {
						World.dir = vert + horz;
					}
				}
			}
		}
		
		return map;
	},
	
	placeLandmark: function(minRadius, maxRadius, landmark, map) {
	
		var x = World.RADIUS, y = World.RADIUS;
		while(!World.isTerrain(map[x][y])) {
			var r = Math.floor(Math.random() * (maxRadius - minRadius)) + minRadius;
			var xDist = Math.floor(Math.random() * r);
			var yDist = r - xDist;
			if(Math.random() < 0.5) xDist = -xDist;
			if(Math.random() < 0.5) yDist = -yDist;
			x = World.RADIUS + xDist;
			if(x < 0) x = 0;
			if(x > World.RADIUS * 2) x = World.RADIUS * 2;
			y = World.RADIUS + yDist;
			if(y < 0) y = 0;
			if(y > World.RADIUS * 2) y = World.RADIUS * 2;
		}
		map[x][y] = landmark;
		return [x, y];
	},
	
	isTerrain: function(tile) {
		return tile == World.TILE.FOREST || tile == World.TILE.FIELD || tile == World.TILE.BARRENS;
	},
	
	chooseTile: function(x, y, map) {
		
		var adjacent = [
			y > 0 ? map[x][y-1] : null,
			y < World.RADIUS * 2 ? map[x][y+1] : null,
			x < World.RADIUS * 2 ? map[x+1][y] : null,
			x > 0 ? map[x-1][y] : null
		];
		
		var chances = {};
		var nonSticky = 1;
		for(var i in adjacent) {
			if(adjacent[i] == World.TILE.VILLAGE) {
				// Village must be in a forest to maintain thematic consistency, yo.
				return World.TILE.FOREST;
			} else if(typeof adjacent[i] == 'string') {
				var cur = chances[adjacent[i]];
				cur = typeof cur == 'number' ? cur : 0;
				chances[adjacent[i]] = cur + World.STICKINESS;
				nonSticky -= World.STICKINESS;
			}
		}
		for(var t in World.TILE) {
			var tile = World.TILE[t];
			if(World.isTerrain(tile)) {
				var cur = chances[tile];
				cur = typeof cur == 'number' ? cur : 0;
				cur += World.TILE_PROBS[tile] * nonSticky;
				chances[tile] = cur;
			}
		}
		
		var list = [];
		for(var t in chances) {
			list.push(chances[t] + '' + t);
		}
		list.sort(function(a, b) {
			var n1 = parseFloat(a.substring(0, a.length - 1));
			var n2 = parseFloat(b.substring(0, b.length - 1));
			return n2 - n1;
		});
		
		var c = 0;
		var r = Math.random();
		for(var i in list) {
			var prob = list[i];
			c += parseFloat(prob.substring(0,prob.length - 1));
			if(r < c) {
				return prob.charAt(prob.length - 1);
			}
		}
		
		return World.TILE.BARRENS;
	},
	
	markVisited: function(x, y) {
		World.state.map[x][y] = World.state.map[x][y] + '!';
	},
	
	drawMap: function() {
		var map = $('#map');
		if(map.length == 0) {
			map = new $('<div>').attr('id', 'map').appendTo('#worldOuter');
			// register click handler
			map.click(World.click);
		}
		var mapString = "";
		for(var j = 0; j <= World.RADIUS * 2; j++) {
			for(var i = 0; i <= World.RADIUS * 2; i++) {
				var ttClass = "";
				if(i > World.RADIUS) {
					ttClass += " left";
				} else {
					ttClass += " right";
				}
				if(j > World.RADIUS) {
					ttClass += " top";
				} else {
					ttClass += " bottom";
				}
				if(World.curPos[0] == i && World.curPos[1] == j) {
					mapString += '<span class="landmark">@<div class="tooltip ' + ttClass + '">流浪者</div></span>';
				} else if(World.state.mask[i][j]) {
					var c = World.state.map[i][j];
					switch(c) {
						case World.TILE.VILLAGE:
							mapString += '<span class="landmark">' + c + '<div class="tooltip' + ttClass + '">村子</div></span>';
							break;
						default:
							if(typeof World.LANDMARKS[c] != 'undefined' && (c != World.TILE.OUTPOST || !World.outpostUsed(i, j))) {
								mapString += '<span class="landmark">' + c + '<div class="tooltip' + ttClass + '">' + World.LANDMARKS[c].label + '</div></span>';
							} else {
								if(c.length > 1) {
									c = c[0];
								}
								mapString += c;
							}
							break;
					}
				} else {
					mapString += '&nbsp;';
				}
			}
			mapString += '<br/>';
		}
		map.html(mapString);
	},
	
	die: function() {
		if(!World.dead) {
			World.dead = true;
			Engine.log('player death');
			Engine.event('game event', 'death');
			Engine.keyLock = true;
			// Dead! Discard any world changes and go home
			Notifications.notify(World, '眼前的世界烟消云散');
			World.state = null;
			Path.outfit = {};
			$('#outerSlider').animate({opacity: '0'}, 600, 'linear', function() {
				$('#outerSlider').css('left', '0px');
				$('#locationSlider').css('left', '0px');
				$('#storesContainer').css({'top': '0px', 'right': '0px'});
				Engine.activeModule = Room;
				$('div.headerButton').removeClass('selected');
				Room.tab.addClass('selected');
				setTimeout(function(){ 
					Room.onArrival(); 
					$('#outerSlider').animate({opacity:'1'}, 600, 'linear');
					Button.cooldown($('#embarkButton'));
					Engine.keyLock = false;
				}, 2000);
			});
		}
	},
	
	goHome: function() {
		// Home safe! Commit the changes.
		$SM.setM('game.world', World.state);
		if(World.state.sulphurmine && $SM.get('game.buildings["硫磺矿"]', true) == 0) {
			$SM.add('game.buildings["硫磺矿"]', 1);
			Engine.event('progress', '硫磺矿');
		}
		if(World.state.ironmine && $SM.get('game.buildings["铁矿"]', true) == 0) {
			$SM.add('game.buildings["铁矿"]', 1);
			Engine.event('progress', '铁矿');
		}
		if(World.state.coalmine && $SM.get('game.buildings["煤矿"]', true) == 0) {
			$SM.add('game.buildings["煤矿"]', 1);
			Engine.event('progress', '煤矿');
		}
		if(World.state.ship && !$SM.get('features.location.spaceShip')) {
			Ship.init();
			Engine.event('progress', 'ship');
		}
		World.state = null;
		
		// Clear the embark cooldown
		var btn = Button.clearCooldown($('#embarkButton'));
		if(Path.outfit['熏肉'] > 0) {
			Button.setDisabled(btn, false);
		}
		
		for(var k in Path.outfit) {
			$SM.add('stores["'+k+'"]', Path.outfit[k]);
			if(World.leaveItAtHome(k)) {
				Path.outfit[k] = 0;
			}
		}
		
		$('#outerSlider').animate({left: '0px'}, 300);
		Engine.activeModule = Path;
		Path.onArrival();
	},
	
	leaveItAtHome: function(thing) {
		 return thing != '熏肉' && thing != '子弹' && thing != '能量元件'  && thing != '护身符' && thing != '药剂'
			 && typeof World.Weapons[thing] == 'undefined' && typeof Room.Craftables[thing] == 'undefined';
	},
	
	getMaxHealth: function() {
		if($SM.get('stores["钢甲"]', true) > 0) {
			return World.BASE_HEALTH + 35;
		} else if($SM.get('stores["铁甲"]', true) > 0) {
			return World.BASE_HEALTH + 15;
		} else if($SM.get('stores["皮甲"]', true) > 0) {
			return World.BASE_HEALTH + 5;
		}
		return World.BASE_HEALTH;
	},
	
	getHitChance: function() {
		if($SM.hasPerk('精密')) {
			return World.BASE_HIT_CHANCE + 0.1;
		}
		return World.BASE_HIT_CHANCE;
	},
	
	getMaxWater: function() {
		if($SM.get('stores["水罐"]', true) > 0) {
			return World.BASE_WATER + 50;
		} else if($SM.get('stores["水桶"]', true) > 0) {
			return World.BASE_WATER + 20;
		} else if($SM.get('stores["水袋"]', true) > 0) {
			return World.BASE_WATER + 10;
		}
		return World.BASE_WATER;
	},
	
	outpostUsed: function(x, y) {
		x = typeof x == 'number' ? x : World.curPos[0];
		y = typeof y == 'number' ? y : World.curPos[1];
		var used = World.usedOutposts[x + ',' + y];
		return typeof used != 'undefined' && used == true;
	},
	
	useOutpost: function() {
		Notifications.notify(null, '水补充好了');
		World.setWater(World.getMaxWater());
		// Mark this outpost as used
		World.usedOutposts[World.curPos[0] + ',' + World.curPos[1]] = true;
	},
	
	onArrival: function() {
		Engine.keyLock = false;
		// Explore in a temporary world-state. We'll commit the changes if you return home safe.
		World.state = $.extend(true, {}, $SM.get('game.world'));
		World.setWater(World.getMaxWater());
		World.setHp(World.getMaxHealth());
		World.foodMove = 0;
		World.waterMove = 0;
		World.starvation = false;
		World.thirst = false;
		World.usedOutposts = {};
		World.curPos = World.copyPos(World.VILLAGE_POS);
		World.drawMap();
		World.setTitle();
		World.dead = false;
		$('div#bagspace-world > div').empty();
		World.updateSupplies();
		$('#bagspace-world').width($('#map').width());
	},
	
	setTitle: function() {
		document.title = '荒原';
	},
	
	copyPos: function(pos) {
		return [pos[0], pos[1]];
	},
	
	handleStateUpdates: function(e){
		
	}
};
