/**
 * Module that registers the outdoors functionality
 */
var Outside = {
	name: "Outside",
	
	_GATHER_DELAY: 60,
	_TRAPS_DELAY: 90,
	_POP_DELAY: [0.5, 3],
	
	_INCOME: {
		'采集工': {
			delay: 10,
			stores: {
				'木头': 1
			}
		},
		'猎户': {
			delay: 10,
			stores: {
				'毛皮': 0.5,
				'肉': 0.5
			}
		},
		'陷阱工': {
			delay: 10,
			stores: {
				'肉': -1,
				'诱饵': 1
			}
		},
		'制革工': {
			delay: 10,
			stores: {
				'毛皮': -5,
				'皮革': 1
			}
		},
		'熏肉工': {
			delay: 10,
			stores: {
				'肉': -5,
				'木头': -5,
				'熏肉': 1
			}
		},
		'铁矿工': {
			delay: 10,
			stores: {
				'熏肉': -1,
				'铁': 1
			}
		},
		'煤矿工': {
			delay: 10,
			stores: {
				'熏肉': -1,
				'煤': 1
			}
		},
		'硫磺矿工': {
			delay: 10,
			stores: {
				'熏肉': -1,
				'硫磺': 1
			}
		},
		'炼钢工': {
			delay: 10,
			stores: {
				'铁': -1,
				'煤': -1,
				'钢': 1
			}
		},
		'军火工': {
			delay: 10,
			stores: {
				'钢': -1,
				'硫磺': -1,
				'子弹': 1
			}
		}
	},
	
	TrapDrops: [
		{
			rollUnder: 0.5,
			name: '毛皮',
			message: '残破的皮毛'
		},
		{
			rollUnder: 0.75,
			name: '肉',
			message: '一点儿肉'
		},
		{
			rollUnder: 0.85,
			name: '鳞片',
			message: '奇怪的鳞片'
		},
		{
			rollUnder: 0.93,
			name: '牙齿',
			message: '散落的牙齿'
		},
		{
			rollUnder: 0.995,
			name: '布匹',
			message: '破烂的布匹'
		},
		{
			rollUnder: 1.0,
			name: '护身符',
			message: '做工粗糙的护身符'
		}
	],
	
	init: function(options) {
		this.options = $.extend(
			this.options,
			options
		);
		
		if(Engine._debug) {
			this._GATHER_DELAY = 0;
			this._TRAPS_DELAY = 0;
		}
		
		// Create the outside tab
		this.tab = Header.addLocation("A Silent Forest", "outside", Outside);
		
		// Create the Outside panel
		this.panel = $('<div>').attr('id', "outsidePanel")
			.addClass('location')
			.appendTo('div#locationSlider');
		
		//subscribe to stateUpdates
		$.Dispatch('stateUpdate').subscribe(Outside.handleStateUpdates);
		
		if(typeof $SM.get('features.location.outside') == 'undefined') {
			$SM.set('features.location.outside', true);
			if(!$SM.get('game.buildings')) $SM.set('game.buildings', {});
			if(!$SM.get('game.population')) $SM.set('game.population', 0);
			if(!$SM.get('game.workers')) $SM.set('game.workers', {});
		}
		
		this.updateVillage();
		Outside.updateWorkersView();
		
		Engine.updateSlider();
		
		// Create the gather button
		new Button.Button({
			id: 'gatherButton',
			text: "采集木头",
			click: Outside.gatherWood,
			cooldown: Outside._GATHER_DELAY,
			width: '80px'
		}).appendTo('div#outsidePanel');
	},
	
	getMaxPopulation: function() {
		return $SM.get('game.buildings["小屋"]', true) * 4;
	},
	
	increasePopulation: function() {
		var space = Outside.getMaxPopulation() - $SM.get('game.population');
		if(space > 0) {
			var num = Math.floor(Math.random()*(space/2) + space/2);
			if(num == 0) num = 1;
			if(num == 1) {
				Notifications.notify(null, '陌生人在夜里抵达.');
			} else if(num < 5) {
				Notifications.notify(null, '饱经风雨的一家人住进了一间小屋.');
			} else if(num < 10) {
				Notifications.notify(null, '一群瘦骨嶙峋，风尘仆仆的人抵达了.');
			} else if(num < 30) {
				Notifications.notify(null, '车队历经磨难来到了小镇，怀着和担忧同等的希望.');
			} else {
				Notifications.notify(null, "镇子繁荣热闹，言语无法形容.");
			}
			Engine.log('population increased by ' + num);
			$SM.add('game.population', num);
		}
		Outside.schedulePopIncrease();
	},
	
	killVillagers: function(num) {
		$SM.add('game.population', num * -1);
		if($SM.get('game.population') < 0) {
			$SM.set('game.population', 0);
		}
		var remaining = Outside.getNumGatherers();
		if(remaining < 0) {
			var gap = -remaining;
			for(var k in $SM.get('game.workers')) {
				var num = $SM.get('game.workers["'+k+'"]');
				if(num < gap) {
					gap -= num;
					$SM.set('game.workers["'+k+'"]', 0);
				} else {
					$SM.add('game.workers["'+k+'"]', gap * -1);
					break;
				}
			}
		}
	},
	
	schedulePopIncrease: function() {
		var nextIncrease = Math.floor(Math.random()*(Outside._POP_DELAY[1] - Outside._POP_DELAY[0])) + Outside._POP_DELAY[0];
    	Engine.log('next population increase scheduled in ' + nextIncrease + ' minutes');
    	Outside._popTimeout = setTimeout(Outside.increasePopulation, nextIncrease * 60 * 1000);
	},
	
	updateWorkersView: function() {
		var workers = $('div#workers');

		// If our population is 0 and we don't already have a workers view,
		// there's nothing to do here.
		if(!workers.length && $SM.get('game.population') == 0) return;

		var needsAppend = false;
		if(workers.length == 0) {
			needsAppend = true;
			workers = $('<div>').attr('id', 'workers').css('opacity', 0);
		}
		
		var numGatherers = $SM.get('game.population');
		var gatherer = $('div#workers_row_gatherer', workers);
		
		for(var k in $SM.get('game.workers')) {
			var workerCount = $SM.get('game.workers["'+k+'"]');
			var row = $('div#workers_row_' + k.replace(' ', '-'), workers);
			if(row.length == 0) {
				row = Outside.makeWorkerRow(k, workerCount);
				
				var curPrev = null;
				workers.children().each(function(i) {
					var child = $(this);
					var cName = child.attr('id').substring(12).replace('-', ' ');
					if(cName != '采集工') {
						if(cName < k && (curPrev == null || cName > curPrev)) {
							curPrev = cName;
						}
					}
				});
				if(curPrev == null && gatherer.length == 0) {
					row.prependTo(workers);
				} 
				else if(curPrev == null)
				{
					row.insertAfter(gatherer);
				} 
				else 
				{
					row.insertAfter(workers.find('#workers_row_' + curPrev.replace(' ', '-')));
				}
				
			} else {
				$('div#' + row.attr('id') + ' > div.row_val > span', workers).text(workerCount);
			}
			numGatherers -= workerCount;
			if(workerCount == 0) {
				$('.dnBtn', row).addClass('disabled');
				$('.dnManyBtn', row).addClass('disabled');
			} else {
				$('.dnBtn', row).removeClass('disabled');
				$('.dnManyBtn', row).removeClass('disabled');
			}
		}
		
		if(gatherer.length == 0) {
			gatherer = Outside.makeWorkerRow('采集工', numGatherers);
			gatherer.prependTo(workers);
		} else {
			$('div#workers_row_gatherer > div.row_val > span', workers).text(numGatherers);
		}
		
		if(numGatherers == 0) {
			$('.upBtn', '#workers').addClass('disabled');
			$('.upManyBtn', '#workers').addClass('disabled');
		} else {
			$('.upBtn', '#workers').removeClass('disabled');
			$('.upManyBtn', '#workers').removeClass('disabled');
		}
		
		
		if(needsAppend && workers.children().length > 0) {
			workers.appendTo('#outsidePanel').animate({opacity:1}, 300, 'linear');
		}
	},
	
	getNumGatherers: function() {
		var num = $SM.get('game.population'); 
		for(var k in $SM.get('game.workers')) {
			num -= $SM.get('game.workers["'+k+'"]');
		}
		return num;
	},
	
	makeWorkerRow: function(name, num) {
		var row = $('<div>')
			.attr('id', 'workers_row_' + name.replace(' ','-'))
			.addClass('workerRow');
		$('<div>').addClass('row_key').text(name).appendTo(row);
		var val = $('<div>').addClass('row_val').appendTo(row);
		
		$('<span>').text(num).appendTo(val);
		
		if(name != 'gatherer') {
		  $('<div>').addClass('upManyBtn').appendTo(val).click([10], Outside.increaseWorker);
			$('<div>').addClass('upBtn').appendTo(val).click([1], Outside.increaseWorker);
			$('<div>').addClass('dnBtn').appendTo(val).click([1], Outside.decreaseWorker);
			$('<div>').addClass('dnManyBtn').appendTo(val).click([10], Outside.decreaseWorker);
		}
		
		$('<div>').addClass('clear').appendTo(row);
		
		var tooltip = $('<div>').addClass('tooltip bottom right').appendTo(row);
		var income = Outside._INCOME[name];
		for(var s in income.stores) {
			var r = $('<div>').addClass('storeRow');
			$('<div>').addClass('row_key').text(s).appendTo(r);
			$('<div>').addClass('row_val').text(Engine.getIncomeMsg(income.stores[s], income.delay)).appendTo(r);
			r.appendTo(tooltip);
		}
		
		return row;
	},
	
	increaseWorker: function(btn) {
		var worker = $(this).closest('.workerRow').children('.row_key').text();
		if(Outside.getNumGatherers() > 0) {
		  var increaseAmt = Math.min(Outside.getNumGatherers(), btn.data);
			Engine.log('increasing ' + worker + ' by ' + increaseAmt);
			$SM.add('game.workers["'+worker+'"]', increaseAmt);
		}
	},
	
	decreaseWorker: function(btn) {
		var worker = $(this).closest('.workerRow').children('.row_key').text();
		if($SM.get('game.workers["'+worker+'"]') > 0) {
		  var decreaseAmt = Math.min($SM.get('game.workers["'+worker+'"]') || 0, btn.data);
			Engine.log('decreasing ' + worker + ' by ' + decreaseAmt);
			$SM.add('game.workers["'+worker+'"]', decreaseAmt * -1);
		}
	},
	
	updateVillageRow: function(name, num, village) {
		var id = 'building_row_' + name.replace(' ', '-');
		var row = $('div#' + id, village);
		if(row.length == 0 && num > 0) {
			row = $('<div>').attr('id', id).addClass('storeRow');
			$('<div>').addClass('row_key').text(name).appendTo(row);
			$('<div>').addClass('row_val').text(num).appendTo(row);
			$('<div>').addClass('clear').appendTo(row);
			var curPrev = null;
			village.children().each(function(i) {
				var child = $(this);
				if(child.attr('id') != 'population') {
					var cName = child.attr('id').substring(13).replace('-', ' ');
					if(cName < name && (curPrev == null || cName > curPrev)) {
						curPrev = cName;
					}
				}
			});
			if(curPrev == null) {
				row.prependTo(village);
			} else {
				row.insertAfter('#building_row_' + curPrev.replace(' ', '-'));
			}
		} else if(num > 0) {
			$('div#' + row.attr('id') + ' > div.row_val', village).text(num);
		} else if(num == 0) {
			row.remove();
		}
	},
	
	updateVillage: function(ignoreStores) {
		var village = $('div#village');
		var population = $('div#population');
		var needsAppend = false;
		if(village.length == 0) {
			needsAppend = true;
			village = $('<div>').attr('id', 'village').css('opacity', 0);
			population = $('<div>').attr('id', 'population').appendTo(village);
		}
		
		for(var k in $SM.get('game.buildings')) {
			if(k == '陷阱') {
				var numTraps = $SM.get('game.buildings["'+k+'"]');
				var numBait = $SM.get('stores["诱饵"]', true);
				var traps = numTraps - numBait;
				traps = traps < 0 ? 0 : traps;
				Outside.updateVillageRow(k, traps, village);
				Outside.updateVillageRow('上饵陷阱', numBait > numTraps ? numTraps : numBait, village);
			} else {
				if(Outside.checkWorker(k)) {
					Outside.updateWorkersView();
				}
				Outside.updateVillageRow(k, $SM.get('game.buildings["'+k+'"]'), village);
			}
		}
		
		population.text('pop ' + $SM.get('game.population') + '/' + this.getMaxPopulation());
		
		var hasPeeps;
		if($SM.get('game.buildings["小屋"]', true) == 0) {
			hasPeeps = false;
			village.addClass('noHuts');
		} else {
			hasPeeps = true;
			village.removeClass('noHuts');
		}
		
		if(needsAppend && village.children().length > 1) {
			village.appendTo('#outsidePanel');
			village.animate({opacity:1}, 300, 'linear');
		}
		
		if(hasPeeps && typeof Outside._popTimeout == 'undefined') {
			Outside.schedulePopIncrease();
		}
		
		this.setTitle();

		if(!ignoreStores && Engine.activeModule === Outside && village.children().length > 1) {
			$('#storesContainer').css({top: village.height() + 26 + 'px'});
		}
	},
	
	checkWorker: function(name) {
		var jobMap = {
			'旅馆': ['猎户', '陷阱工'],
			'制革屋': ['制革弓'],
			'熏肉房': ['熏肉工'],
			'铁矿': ['铁矿工'],
			'煤矿': ['煤矿工'],
			'硫磺矿': ['硫磺矿工'],
			'炼钢坊': ['炼钢工'],
			'警械坊' : ['军火工']
		};
		
		var jobs = jobMap[name];
		var added = false;
		if(typeof jobs == 'object') {
			for(var i = 0, len = jobs.length; i < len; i++) {
				var job = jobs[i];
				if(typeof $SM.get('game.buildings["'+name+'"]') == 'number' && 
						typeof $SM.get('game.workers["'+job+'"]') != 'number') {
					Engine.log('adding ' + job + ' to the workers list');
					$SM.set('game.workers["'+job+'"]', 0);
					added = true;
				}
			}
		}
		return added;
	},
	
	updateVillageIncome: function() {		
		for(var worker in Outside._INCOME) {
			var income = Outside._INCOME[worker];
			var num = worker == '采集工' ? Outside.getNumGatherers() : $SM.get('game.workers["'+worker+'"]');
			if(typeof num == 'number') {
				var stores = {};
				if(num < 0) num = 0;
				var tooltip = $('.tooltip', 'div#workers_row_' + worker.replace(' ', '-'));
				tooltip.empty();
				var needsUpdate = false;
				var curIncome = $SM.getIncome(worker);
				for(var store in income.stores) {
					stores[store] = income.stores[store] * num;
					if(curIncome[store] != stores[store]) needsUpdate = true;
					var row = $('<div>').addClass('storeRow');
					$('<div>').addClass('row_key').text(store).appendTo(row);
					$('<div>').addClass('row_val').text(Engine.getIncomeMsg(stores[store], income.delay)).appendTo(row);
					row.appendTo(tooltip);
				}
				if(needsUpdate) {
					$SM.setIncome(worker, {
						delay: income.delay,
						stores: stores
					});
				}
			}
		}
		Room.updateIncomeView();
	},
	
	updateTrapButton: function() {
		var btn = $('div#trapsButton');
		if($SM.get('game.buildings["陷阱"]', true) > 0) {
			if(btn.length == 0) {
				new Button.Button({
					id: 'trapsButton',
					text: "检查陷阱",
					click: Outside.checkTraps,
					cooldown: Outside._TRAPS_DELAY,
					width: '80px'
				}).appendTo('div#outsidePanel');
			} else {
				Button.setDisabled(btn, false);
			}
		} else {
			if(btn.length > 0) {
				Button.setDisabled(btn, true);
			}
		}
	},
	
	setTitle: function() {
		var numHuts = $SM.get('game.buildings["小屋"]', true);
		var title;
		if(numHuts == 0) {
			title = "静谧森林";
		} else if(numHuts == 1) {
			title = "孤独小屋";
		} else if(numHuts <= 4) {
			title = "小型村落";
		} else if(numHuts <= 8) {
			title = "中等村落";
		} else if(numHuts <= 14) {
			title = "大型村落";
		} else {
			title = "喧嚣小镇";
		}
		
		if(Engine.activeModule == this) {
			document.title = title;
		}
		$('#location_outside').text(title);
	},
	
	onArrival: function(transition_diff) {
		Outside.setTitle();
		if(!$SM.get('game.outside.seenForest')) {
			Notifications.notify(Outside, "天色阴沉，风无情地刮着");
			$SM.set('game.outside.seenForest', true);
		}
		Outside.updateTrapButton();
		Outside.updateVillage(true);

		Engine.moveStoresView($('#village'), transition_diff);
	},
	
	gatherWood: function() {
		Notifications.notify(Outside, "林地上散落着枯枝败叶");
		var gatherAmt = $SM.get('game.buildings["货车"]', true) > 0 ? 50 : 10;
		$SM.add('stores["木头"]', gatherAmt);
	},
	
	checkTraps: function() {
		var drops = {};
		var msg = [];
		var numTraps = $SM.get('game.buildings["陷阱"]', true);
		var numBait = $SM.get('stores["诱饵"]', true);
		var numDrops = numTraps + (numBait < numTraps ? numBait : numTraps);
		for(var i = 0; i < numDrops; i++) {
			var roll = Math.random();
			for(var j in Outside.TrapDrops) {
				var drop = Outside.TrapDrops[j];
				if(roll < drop.rollUnder) {
					var num = drops[drop.name];
					if(typeof num == 'undefined') {
						num = 0;
						msg.push(drop.message);
					}
					drops[drop.name] = num + 1;
					break;
				}
			}
		}
		var s = '陷阱捕获到';
		for(var i = 0, len = msg.length; i < len; i++) {
			if(len > 1 && i > 0 && i < len - 1) {
				s += ", ";
			} else if(len > 1 && i == len - 1) {
				s += " and ";
			}
			s += msg[i];
		}
		
		var baitUsed = numBait < numTraps ? numBait : numTraps;
		drops['诱饵'] = -baitUsed;
		
		Notifications.notify(Outside, s);
		$SM.addM('stores', drops);
	},
	
	handleStateUpdates: function(e){
		if(e.category == 'stores'){
			Outside.updateVillage();
		} else if(e.stateName.indexOf('game.workers') == 0
		          || e.stateName.indexOf('game.population') == 0){
			Outside.updateVillage();
			Outside.updateWorkersView();
			Outside.updateVillageIncome();
		};
	}
};
