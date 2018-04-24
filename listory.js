
// listory.js - a freezr app by sf v2018-03
// A poor man's CRM - or Small Lists with history

var listory; 

var listory_stats = {
	// miscellaneous vars
	'warningTimeOut':null,
	'syncInProgress': false,
	'alreadySyncedOnce': false,
	'startTouch':{id:null, startX:0, startY:0, moveX:0, moveY:0},
	'encryptPW':null, // in case user doesn't want encrypt password to be strored
	'encryptFault':false,
	'localSaveIntervaler':null,
	'syncCounter': 1
	}
	var SAVES_PER_SYNC = 5;
	var NUM_NOTES_TO_DOWNLOAD = 20; 
var screens = {width:window.innerWidth,height:window.innerHeight}

/* Quirky things
listoryDate: this is a date which the user changes to replace _date_modified for the feed

*/

// Start Up
freezr.initPageScripts = function() {
	listory = new jlos('listory', 
		{'valueAtInit':
		   {'last_server_sync_time': 0,
			'fj_oldest_item':null, // listory_notery_review_change
			'fj_local_id_counter':1,
			'listoryViews': {},
			'encryptDo':false, // whether you choose to encrypt or not listory_notery_review_change
			'encryptPW':null,  // the password (null if not stored locaaly) listory_notery_review_change
			'encryptCipherTest':null, // a test cipher to make sure password is correct when re-entered listory_notery_review_change
			'freezr_user_id': null, // user id
			'freezr_server_address':null, // used for offline usage
			'freezr_app_code': null, // used for offline usage
			'feed': 	  
				// log of history of changes
				//  records of changes that have not been accepted yet
				// listoryId, listoryIdType, recordId, accepted?, rejected?, changedRecords= {}, notes, decision_date 
			[
			],
			'listMeta':[ 
				// meta data on each list
			],
			'records': [
				// records for all lists
			]
		  },
		 'saver':'dosave', // listory_notery - onl for debug - remove later
	}); 
	if (listory.data.freezr_app_code) {
		freezr_app_code = notery.data.freezr_app_code;
		freezr_user_id = notery.data.freezr_user_id;
		freezr_server_address= notery.data.freezr_server_address;
		freezr_user_is_admin = notery.data.freezr_user_is_admin;
	}

	document.addEventListener('click', function(e) { 
		//onsole.log("click"+e.target.id)
		var elSects = e.target.id.split('_');
		if (elSects[0]== "click") {doClick(elSects)}
		hideAllMenus(e);
	}, false);

	window.onresize = function(event) {
	//
		if (viewGridTableIsFixed()) {setFixedBodyHeight(); resetHeaderLengths();}
	};	

	if (!listory.data.freezr_user_id) listory.data.freezr_user_id = freezr_user_id? freezr_user_id:null;
	if (freezr_user_id && freezr_user_id != listory.data.freezr_user_id){
		if (confirm("There is data from another user on your device. If you press okay, that data will be deleted.")) {
			listory.reInitializeData();
			listory.data.freezr_user_id = freezr_user_id;
			listory.save();
		} else {
			wrongId = true;
			window.location.href = '/';
		}
	} else {
		window.addEventListener("popstate", showUrlState,true)
		showUrlState();
		trySyncing();
	}
}
// CLICK HANDLING
var doClick = function (args) {
	//onsole.log("click "+args)
	switch(args[1]) {
		case 'newList':
			createNewList();
			break;
		case 'allLists':
			showAllLists();
			break;
		case 'OneRecordView':
			closeNewInputScreen();
			break;
		case 'saveAllRecs':
			saveAllRecordChanges();
			break;
		case 'menuBackGround':
			break;
		default:
			true;
			//onsole.log('undefined click ')
	}
}


// VIEWS  TRANSITIONS - GENERAL
var showUrlState = function() {
	let parts = window.location.search.slice(1).split("&");
	let firstOne = true
	if (parts.length>0) {

		let source=null, urlDetails = {}
		parts.forEach(aPart => {
			let items = aPart.split('=');  
			if(items.length>1) {urlDetails[items[0] ]= items[1]}
		}) 
		if (urlDetails.id) {
			showListDetails(urlDetails['id'], {idType:urlDetails.idType,viewNum: urlDetails.viewNum});
			source= "listDetails"
		} else {showAllLists(); source = "allLists"};
		//if (urlDetails.panel) viewTransitionTo(urlDetails.panel, {source:source});
		//onsole.log(urlDetails,viewTransitionSources)
		if (!urlDetails.panel && viewTransitionSources.type) viewTransitionTo(viewTransitionSources.type , {'doClose':true,source:source})

	} else {
		showAllLists();		
	}
}
var viewTransitionSources = {};
var viewTransitionTo = function(panel, options) {
	//onsole.log("viewTransitionTo",panel,options)
	if (isMobile()) {
		console.log('ERR: undefined viewTransitionTo for MOBILE')
	} else {
		setUrlHistory(panel)
		switch(panel) {
			case 'newListMetaInputScreen':
				if (options.doClose) { 
					document.getElementById('oneRecordInner').className = "oneRecordInner_Desktop oneRecordViewHidden_Desktop";
					setTimeout(function() {
						document.getElementById('click_menuBackGround').style.display = "none";
						document.getElementById('click_OneRecordView').style.display = "none";	
						document.getElementsByTagName("BODY")[0].style.overflow = null;
					} ,600);

					switch(viewTransitionSources.newListMetaInputScreen) {
						case'showAllLists':
							showAllLists();
							break;
						case 'createNewList':
							if (options.source == "save") {
								let theId = tempChangeRecords.listMeta._id;
								let idType = theId? "dbid":"localtemp";
								if (!theId) {
									let metaRecord = listory.data.listMeta[listory.data.listMeta.length-1];
									theId = metaRecord._id || metaRecord.fj_local_temp_unique_id
								}
								showListDetails(theId, {idType:idType})								
							} else { // options.source == "close"
								// do nothing
							}
							break;
						case 'showListDetails': 
							showListDetails(shownList.listoryId, {idType:shownList.listoryIdType});
							break;
						default:
							console.error("UNDEFINED viewTransitionTo newListMetaInputScreen "+viewTransitionSources.newListMetaInputScreen)
							break;

					}
					viewTransitionSources.type = null;
					viewTransitionSources.newListMetaInputScreen = null;
				} else {
					viewTransitionSources.type = 'newListMetaInputScreen';
					viewTransitionSources.newListMetaInputScreen = options.source;
					document.getElementsByTagName("BODY")[0].style.overflow = "hidden";

					document.getElementById('click_menuBackGround').style.display = "block";
					document.getElementById('click_OneRecordView').style.display = "block";
					setTimeout(function() { 
						document.getElementById('oneRecordInner').className = "oneRecordInner_Desktop oneRecordViewShown_Desktop"},50);	
					document.getElementById("oneRecordInner").scrollTop=0;

				}
				break;
			case 'recordDetailScreen': 
				if (options.doClose) { 
					document.getElementById('oneRecordInner').className = "oneRecordInner_Desktop oneRecordViewHidden_Desktop";
					setTimeout(function() {
						document.getElementById('click_menuBackGround').style.display = "none";
						document.getElementById('click_OneRecordView').style.display = "none";	
						document.getElementsByTagName("BODY")[0].style.overflow = null;
					} ,600);
					viewTransitionSources.type = null;
					viewTransitionSources.newListMetaInputScreen = null;
					//showListDetails(shownList.listoryId, {idType:shownList.listoryIdType});
				} else {
					viewTransitionSources.type = 'recordDetailScreen';
					viewTransitionSources.newListMetaInputScreen = options.source;
					document.getElementsByTagName("BODY")[0].style.overflow = "hidden";

					document.getElementById('click_menuBackGround').style.display = "block";
					document.getElementById('click_OneRecordView').style.display = "block";
					setTimeout(function() { 
						document.getElementById('oneRecordInner').className = "oneRecordInner_Desktop oneRecordViewShown_Desktop"},50);	
					document.getElementById("oneRecordInner").scrollTop=0;
				}
				break;
			case 'feedViewScreen': 
				if (options.doClose) { 
					document.getElementById('oneRecordInner').className = "oneRecordInner_Desktop oneRecordViewHidden_Desktop";
					setTimeout(function() {
						document.getElementById('click_menuBackGround').style.display = "none";
						document.getElementById('click_OneRecordView').style.display = "none";	
						document.getElementsByTagName("BODY")[0].style.overflow = null;
					} ,600);
					viewTransitionSources.type = null;
					viewTransitionSources.newListMetaInputScreen = null;
					showListDetails(shownList.listoryId, {idType:shownList.listoryIdType});
				} else {
					viewTransitionSources.type = 'feedViewScreen';
					viewTransitionSources.newListMetaInputScreen = options.source;
					document.getElementsByTagName("BODY")[0].style.overflow = "hidden";

					document.getElementById('click_menuBackGround').style.display = "block";
					document.getElementById('click_OneRecordView').style.display = "block";
					setTimeout(function() { 
						document.getElementById('oneRecordInner').className = "oneRecordInner_Desktop oneRecordViewShown_Desktop"},50);	
					document.getElementById("oneRecordInner").scrollTop=0;
				}	

				break;
			default:
				console.log('ERR: undefined viewTransitionTo ')
		}
	}
}
const CHGED_FIELD_COLOR = 'blue';
const UNSUMMED_NUM_COLOR = 'red';
const DEFAULT_COLOR = 'black'
const GRID_TYPES = ['flex grid','fixed grid','listing']


// ALL LISTS
var showAllLists = function() {
	//history.pushState(null, null, 'index.html' );
	shownList = iniitalizeShownList();
	shownList.mainPanelNowShowing = "allLists";

		let mainDiv = dg.el('mainDiv', {'clear':true});
		mainDiv.appendChild(dg.div({className:'topMenuHolder topMenuTopRightAdjust',style:{float:'right'}, onclick:function () {showFeedView()}},
								dg.span({className:'fa fa-list-alt topMenuItems clickable',
										 'id':'click_feedHistory_2'}),
								dg.span({className:'topMenuText clickable',
										 'id':'click_feedHistory_3'},
										 'Feed History')
							))		
		mainDiv.appendChild(dg.div({className:'topMenuHolder',style:{float:'right'}},
								dg.span({className:'fa fa-plus topMenuItems clickable',
										 'id':'click_newList_1'}),
								dg.span({className:'topMenuText clickable',
										 'id':'click_newList_2'},
										 'New List')
							))
		mainDiv.appendChild(dg.div({'className':'mainListName'}, 
										dg.span({className:"fa fa-th"}),
										" Your lists"));
		mainDiv.appendChild(dg.div( 
								{style:{color:'grey','margin-bottom':'10px','text-align':'center',}}, 
								"Search (Coming Soon)"));
		let allInner = dg.div({id:"allListsInner"})
		mainDiv.appendChild(allInner)
		let allLists = listory.list('listMeta',{sort:true});
		for (var i=allLists.length-1; i>-1;  i--) {
			let item = allLists[i];
			if (!item.fj_deleted) {
				let idType = item._id? 'dbid':'localtemp';
				let id = item._id || item.fj_local_temp_unique_id;
				allInner.appendChild(
					dg.div({
						id:'gotoList_'+idType+'_'+id,
						className:'mainDivlistListName',
						onclick: function(e) { 
							if (e.target.id.slice(0,4) == 'goto') showListDetails(id, {'idType':idType})
						}},
						item.name,
							dg.div(
								{id:'editList_'+idType+'_'+id,
								 className:'mainDivlistListEditButt',
								 onclick: function(e) {showListMetaDetails(listory.get('listMeta', id, {idType:idType}), {source:'showAllLists'} )}
								},
								'Properties'),
							dg.div(
								{className:'mainDivlistListDesc'},
								item.description),
							dg.div({className:'mainDivlistListViews'},
								(item.tags? item.tags.join(" "): " "))
					)
				)
			}
		}
		allInner.appendChild(dg.div({'style':{'margin-top':'10px'}},
			dg.button({className:"smallButt padded",
				id:"butt_getMoreLists",
				onclick: getOlderListsOnline 
			},"More Online"
		)))

	if (listory.isEmpty('listMeta')) createNewList();
}
var createNewList = function() {
	let listMeta = DEFAULT_NEW_LISTMETA;
	listMeta.type  = "new";
	showListMetaDetails(listMeta, {source:'createNewList'});
	dg.el('listMeta_name').focus();
}

// LIST META
var tempChangeRecords = {
	'listMeta': null
}
const DEFAULT_NEW_LISTMETA = {
	/* 
	listMeta[x]: {
		fields: {name , displayName , }
		views: [{	name:"", 
					type:"", 
					showFields:[] , 
					filters: [{field:"", value:"", paramType:"", symbol:""]   }  ]
	}

	*/
	views : [{'name':'Default grid', 'type':'fixed grid', 'showFields':"", filters: []}],
	fields : []
}
var showListMetaDetails = function(listMeta, options) {
	tempChangeRecords.listMeta = JSON.parse(JSON.stringify(listMeta));
	viewTransitionTo("newListMetaInputScreen", {doClose: false, source:options.source});
	populateListMetaDetails(tempChangeRecords.listMeta);	
}
var populateListMetaDetails = function(listMetaData, options={showSaveButt:false}) {
	listMetaData = listMetaData || {};
	listMetaData.fields = listMetaData.fields || [];
	//onsole.log("populateListMetaDetails", listMetaData)
	let canEdit = (!tempChangeRecords.listMeta._owner || tempChangeRecords.listMeta._owner == freezr_user_id)
	if (!canEdit) options.showSaveButt = false;

	const topTableOptions = {
		keys: { // shows which fields to show and and not show in the grid
			showThese: ['title','value'],
			dontShow:[] // redundant - for clarity only
		},
		props: { // properties by tag name or field specific
			th: {style:{display:'none'}},
			tr:null,
			td: {style:{'color':CHGED_FIELD_COLOR}},
			keyspecific: {
				'title': {style: {'min-width':'125px'}},
				'value': {
					style:{
						'border-bottom':'1px solid black',
						'min-width':'200px'
					},
					'contentEditable':canEdit,
					'onkeydown': function(e) {
						if (e.keyCode == 13 || e.keyCode == 9) {
							e.preventDefault();
							let tabSequence = ['listMeta_name','listMeta_description','listMeta_tags','butt_add_View'];
							let nextTab =  dg.el(tabSequence [tabSequence.indexOf(e.target.id)+1]);
							if (nextTab) nextTab.focus()
						} else if (!canEdit){
							e.preventDefault();
						} else {
							e.target.style.color = CHGED_FIELD_COLOR;
							setTimeout(function() {updateListMeta(e)},0)
						}
					},
					'onpaste': function(e) {
						if (!canEdit){
							e.preventDefault();
						} else {
							setTimeout(function() {
								e.target.style.color = CHGED_FIELD_COLOR;
								e.target.innerHTML = e.target.innerText;
								updateListMeta(e);
							},0)
						}
					}
				}
			},
			id: function(key, record, rowCounter) {return (key=="value" && record && record.id)? (record.id): null }
		},
		transform: {
			'title': function(tag, props, record, rowCounter) {
				if (record.title == "tempUniqueId:") {
					let editable = (tempChangeRecords.listMeta._id || !canEdit);
					return dg.makeElement('td', {style:{'color':'grey','font-style':'italic'}}, (editable?"Temporary":"Unique")+" id:")
				} else {										
					return null; 
				}
			},
			'value': function(tag, props, record, rowCounter) {
				if (record.title == "tempUniqueId:") {
					let editable = (tempChangeRecords.listMeta._id || !canEdit)? false:true;
					return dg.makeElement('td', {'contentEditable':editable,style:{'color':'grey','font-style':'italic'},id:'listMeta_tempUniqueId'}, record.value)
				} else if (record.title == "Tags:"){
					let val = (record.value && record.value.length>0)?record.value.join(" "):""
					return dg.makeElement('td', props, val)
				} else {										
					return null; 
				}
			}}
	}
	const viewsTableOptions = {
		// latertodo - removed filter from main props
		keys: { // shows which fields to show and and not show in the grid
			showThese: ['more', 'name', 'type','showFields','delete'] // ,,'filters'
		}, 
		headers: { // header names
			name: 'Name',
			type: 'Type',
			showFields: "Show fields",
			// filters: 'Filter fields', // todolater - use in details view
			more: ' ',
			delete:' ',
		},
		headerTitles: {
			name: null,
			type: 'Choose Grid type for spreadsheet like view or a stream for a list.',
			showFields: 'Space separated list of field names that should ne shown, in order.',
			//filters: 'Field values to filter by',	// todolater - use in details view	
			'more':'View details',
			'delete':'Delete View'
		},
		props: { // properties by tag name or field specific
			table: {
				'id':'listMeta_viewsTable',
				'className': 'mainTable'
			},
			th: {'className':'mainTableTh'},
			tr:null,
			td: {
				'className':'mainTableTd',
				'onkeydown': function(e) {
					if (e.keyCode == 13 || e.keyCode == 9) {
							e.preventDefault();
							let tabSequence = ['name','type','showFields'];
							let parts = e.target.id.split('_')
							//onsole.log(parts)
							if (parts[0]!="butt"){
									let nextTab =  dg.el('listMeta_views_'+parts[2]+'_'+tabSequence [tabSequence.indexOf(parts[3])+(e.shiftKey? -1:1)]);
									if (!nextTab && parts[3]== 'showFields') nextTab = dg.el('butt_add_Filter_'+parts[2])
									if (!nextTab) nextTab = dg.el('listMeta_views_'+(parseInt(parts[2])+ (e.shiftKey? -1:1) )+'_name')
									if (!nextTab) nextTab = dg.el(e.shiftKey? 'listMeta_description':'butt_add_View')
									if (nextTab) nextTab.focus();
							}

					} else if (!canEdit) {
						e.preventDefault();
					} else {
						e.target.style.color = CHGED_FIELD_COLOR;
						setTimeout(function() {updateListMeta(e)},0)
					}
				},
				'onpaste': function(e) {
					if (!canEdit) {
						e.preventDefault();
					} else {
						setTimeout(function() {
							e.target.style.color = CHGED_FIELD_COLOR;
							e.target.innerHTML = e.target.innerText;
							updateListMeta(e);
						},0)
					}
				}
			},
			keyspecific: {
				'name': {'contentEditable':canEdit},
				'showFields': {'contentEditable':canEdit,'data-placeholder':"Show All "}
			},
    		id: function(key, record, rowCounter) {return key=='type'? null:"listMeta_views_"+rowCounter+"_"+key}
		},
		transform: {
			'type': function(tag, props, record, rowCounter) {
				setTimeout(function(){dg.el("listMeta_views_"+rowCounter+"_type").value = tempChangeRecords.listMeta.views[rowCounter].type},0)
				return dg.makeElement(tag, props,
					dg.createSelect(
						GRID_TYPES,
						{	'className':'mainTableChooser', 
							'id':"listMeta_views_"+rowCounter+"_type",
							'disabled': (!canEdit),
							'onchange': function(e) {
								this.style.color = CHGED_FIELD_COLOR;
								setTimeout(function() {updateListMeta(e)},0)
							}
						}
					)
				)
			},

			'more': function (tag, props, record, rowCounter) {
				let theEl = dg.span (
				 {	'className':'fa fa-angle-right',
				 	'style': {'cursor':'pointer','text-align':'center',width:'100%','color':'lightseagreen','font-size':'18px','font-weight':'bold','padding-left':'2px','padding-right':'4px'},
				 	'contentEditable':false,
					'id': "listMeta_views_"+rowCounter+"_more",
					'onclick': function(e) {
						showWarning("Coming later - Editing details of Views",3000)
					}
				 })
				return dg.makeElement(tag, props, theEl);
			},

			'delete': function (tag, props, record, rowCounter) {
				let theEl = dg.span (
				 {	'className':'fa fa-trash',
				 	'style': {'cursor':'pointer','text-align':'center',width:'100%','color':(canEdit?'lightseagreen':'grey'),'font-size':'16px','padding-left':'2px','padding-right':'2px'},
				 	'contentEditable':false,
					'id': "listMeta_views_"+rowCounter+"_more",
					'onclick': function(e) {
						if (canEdit){
							tempChangeRecords.listMeta.views.splice(rowCounter,1);
							if (tempChangeRecords.listMeta.views.length==0)tempChangeRecords.listMeta.views.push({'filters':[]});
							populateListMetaDetails(tempChangeRecords.listMeta, {showSaveButt:true})	
						}				
					}
				 })
				return dg.makeElement(tag, props, theEl);
			}

			/* todolater - to use in detailsview
			'filters': function(tag, props, record, rowCounter) {
				return dg.makeElement(tag, props, dg.span(
					dg.table (record.filters, viewsTableFilterOptions(rowCounter) ), 
					dg.button({ 'id':'butt_add_Filter_'+rowCounter,
		    			'className': 'fa fa-plus smallFaButt',
		    			'onkeydown': function(e) {
			    			if (e.keyCode == 13 || e.keyCode == 9) {
			    				e.preventDefault();
			    				//onsole.log("going to "+'listMeta_views_'+(rowCounter+1)+'_name')
			    				let nextTab = dg.el('listMeta_views_'+(rowCounter+1)+'_name');
			    				if (!nextTab) nextTab = dg.el('butt_add_View');
			    				if (nextTab) nextTab.focus();
		    				}
		    			},
		    			'onclick': function (e) {
		    				let theId = e.target.id || e.target.parentNode.id;	
		    				if (theId) {
		    					let parts = theId.split('_');
		    					let viewRow = parseInt(parts[3]);
		    					//onsole.log("viewRow "+viewRow)
		    					tempChangeRecords.listMeta.views[viewRow].filters.push({'symbol':'='});
		    					dg.el('listMeta_viewsFilterTable_'+viewRow).appendChild(dg.row({},viewsTableFilterOptions(viewRow),tempChangeRecords.listMeta.views[viewRow].filters.length-1))
		    					let elToFocus = dg.el('listMeta_views_'+viewRow+'_filters_'+(tempChangeRecords.listMeta.views.length-1)+"_field")
		    					if (elToFocus) elToFocus.focus()
		    				}
		    			}
		    		},
		    		dg.span({'className':'mainFaButtInner'} , 'Add a Filter')
		    		)	
				))
			}
			*/
		}
	}
	const fieldsTableOptions = {
		keys: { // shows which fields to show and and not show in the grid
			showThese: ['more','name', 'type', 'main','typedetails', 'displayName','description']
		}, 
		headers: { // header names
			name: 'Name',
			main: 'Main',
			description: 'Description',
			type: 'Type',
			typedetails: "Options",
			displayName: "Display Name",
			more: " "
		},
		headerTitles: {
			name: "Field name. Cannot have any space",
			type: 'Type of input',
			main: 'Critical field - shown in feed view',
			typedetails: 'For mutli-choice types, enter a comma separated list of options',
			description: 'Description of field, which appears when you hover over the column title',
			displayName: 'The column title - can have spaces',
			more:'See details'
		},
		props: { // properties by tag name or field specific
			table: {
				'id':'listMeta_fieldsTable',
				'className': 'mainTable'
			},
			th: {'className':'mainTableTh'},
			tr:null,
			td: {
				'className':'mainTableTd',
				'onkeydown': function(e) {
					//onsole.log("e.target.id"+e.target.id);
					let changePath = e.target.id.split("_")
					if (e.keyCode == 13 || e.keyCode == 9) {
							e.preventDefault();
							let tabSequence = ['name', 'type', 'displayName','description'];
							let parts = e.target.id.split('_')
							//onsole.log(parts)
							if (parts[0]!="butt"){
								let nextTab =  dg.el('listMeta_fields_'+parts[2]+'_'+tabSequence [tabSequence.indexOf(parts[3])+(e.shiftKey? -1:1)]);
								if (!nextTab) nextTab = dg.el('listMeta_fields_'+(parseInt(parts[2])+ (e.shiftKey? -1:1) )+'_name')
								if (!nextTab) nextTab = dg.el(e.shiftKey? 'listMeta_description':'butt_add_Field')
								if (nextTab) nextTab.focus();
							}

					} else if (!canEdit ){ e.preventDefault();
					} else if (tempChangeRecords.listMeta.type != "new" && changePath[3]=="name" && tempChangeRecords.listMeta.fields[parseInt(changePath[2])].listoryFieldIsNew != "new"){ 
						e.preventDefault();
						console.warn("CANNOT CHANGE EXISTING FIEDS AT THIS POINT - To change");
						showWarning("Cannot change existing fields",5000)
					} else {
						e.target.style.color = CHGED_FIELD_COLOR;
						setTimeout(function() {updateListMeta(e)},0)
					}
				},
    			'onpaste': function(e) {
    				if (!canEdit ){ e.preventDefault();
					} else {
						setTimeout(function() {
							e.target.style.color = CHGED_FIELD_COLOR;
							e.target.innerHTML = e.target.innerText;
							updateListMeta(e);
						},0)
					}
				}
			},
			keyspecific: {
				'name': {'contentEditable':canEdit},
				'description': {'contentEditable':canEdit},
				'displayName': {'contentEditable':canEdit},
				'typedetails': {style:{'background-color':'grey'}}
			},
    		id: function(key, record, rowCounter) {return key=='type'? null:"listMeta_fields_"+rowCounter+"_"+key}
		},
		transform: {
			'type': function(tag, props, record, rowCounter) {
				//onsole.log("dg type is "+record.type+" tag "+tag)
				//onsole.log(record)
				let theEl = dg.makeElement(tag, props, dg.select(
					 {	'value':record.type, 
						'className':'mainTableChooser', 
						'id':"listMeta_fields_"+rowCounter+"_type",
						'disabled':(!canEdit),
						'onchange': function(e) {
							this.style.color = CHGED_FIELD_COLOR;
							dg.el("listMeta_fields_"+rowCounter+"_typedetails").contentEditable = (this.value == 'multichoice');
							dg.el("listMeta_fields_"+rowCounter+"_typedetails").style['background-color'] = ((this.value == 'multichoice')? null:'grey')
							setTimeout(function() {updateListMeta(e)},0)
						}
					 }, dg.option('general'), 
					 	dg.option('number'), 
					 	dg.option('multichoice'), 
					 	dg.option('boolean'), 
					 	dg.option('unique')
				))
				//onsole.log("setting value of "+record.type)
				theEl.firstChild.value = record.type;
				return theEl
			},
			'typedetails': function (tag, props, record, rowCounter) {
				if (record.type == 'multichoice') {props.contentEditable = canEdit; props.style['background-color']=null}
				return dg.makeElement(tag, props, record.typedetails);
			},
			'main': function (tag, props, record, rowCounter) {
				let theEl = dg.makeElement('input',
				 {	'type':'checkbox',
				 	'className':'mainTableBool',
				 	'style': {'margin-left':'10px'},
				 	'contentEditable':false,
				 	'disabled':(!canEdit),
					'id': "listMeta_fields_"+rowCounter+"_main",
					'onchange': function(e) {setTimeout(function() {updateListMeta(e)},1)}
				 })
				theEl.checked = record.main? true:false;
				return dg.makeElement(tag, props, theEl);
			},
			'more': function (tag, props, record, rowCounter) {
				let theEl = dg.span (
				 {	'className':'fa fa-angle-right',
				 	'style': {'cursor':'pointer','text-align':'center',width:'100%','color':'lightseagreen','font-size':'18px','font-weight':'bold','padding-left':'2px','padding-right':'4px'},
				 	'contentEditable':false,
					'id': "listMeta_fields_"+rowCounter+"_more",
					'onclick': function(e) {showWarning("Coming later - Editing details of fields and deleting fields",3000)}
				 })
				return dg.makeElement(tag, props, theEl);
			}
		}
	}
	const sharingTableOptions = {
		// latertodo - removed filter from main props
		keys: { // shows which fields to show and and not show in the grid
			showThese: ['name', 'adder','editor','delete'] 
		}, 
		headers: { // header names
			name: 'Id of person to share with',
			adder: "Can add records",
			editor: 'Can edit others',
			delete:' ',
		},
		headerTitles: {
			name: "Name of person to share with",
			adder: 'Can add new records',
			editor: 'Can edit and accept changes to others records',
			'delete':'Delete Person'
		},
		props: { // properties by tag name or field specific
			table: {
				'id':'listMeta_sharingTable',
				'className': 'mainTable'
			},
			th: {'className':'mainTableTh'},
			tr:null,
			td: {
				'className':'mainTableTd',
				'onkeydown': function(e) {
					if (e.keyCode == 13 || e.keyCode == 9) {
							e.preventDefault();
							let tabSequence = ['name', 'adder','editor','delete'];
							let parts = e.target.id.split('_')
							//onsole.log(parts)
							if (parts[0]!="butt"){
									let nextTab =  dg.el('listMeta_sharing_'+parts[2]+'_'+tabSequence [tabSequence.indexOf(parts[3])+(e.shiftKey? -1:1)]);
									if (!nextTab) nextTab = dg.el('listMeta_sharing_'+(parseInt(parts[2])+ (e.shiftKey? -1:1) )+'_name')
									if (!nextTab) nextTab = dg.el(e.shiftKey? 'listMeta_description':'butt_add_Sharing')
									if (nextTab) nextTab.focus();
							}
					} else {
						e.target.style.color = CHGED_FIELD_COLOR;
						setTimeout(function() {updateListMeta(e)},0)
					}
				},
				'onpaste': function(e) {
					setTimeout(function() {
						e.target.style.color = CHGED_FIELD_COLOR;
						e.target.innerHTML = e.target.innerText;
						updateListMeta(e);
					},0)
				}
			},
			keyspecific: {
				'name': {'contentEditable':canEdit}
			},
    		id: function(key, record, rowCounter) {return key=='type'? null:"listMeta_sharing_"+rowCounter+"_"+key}
		},
		transform: {
			'adder': function (tag, props, record, rowCounter) {
				let theEl = dg.makeElement('input',
				 {	'type':'checkbox',
				 	'className':'mainTableBool',
				 	'disabled':(!canEdit),
				 	'style': {'margin-left':'10px'},
				 	'contentEditable':false,
					'id': "listMeta_sharing_"+rowCounter+"_adder",
					'onchange': function(e) {setTimeout(function() {updateListMeta(e)},1)}
				 })
				newprops = {style:{'text-align':'center'}}
				theEl.checked = record.adder? true:false;
				return dg.makeElement(tag, newprops, theEl);
			},

			'editor': function (tag, props, record, rowCounter) {
				let theEl = dg.makeElement('input',
				 {	'type':'checkbox',
				 	'className':'mainTableBool',
				 	'style': {'margin-left':'10px'},
				 	'disabled':(!canEdit),
				 	'contentEditable':false,
					'id': "listMeta_sharing_"+rowCounter+"_editor",
					'onchange': function(e) {
						if (this.checked)dg.el("listMeta_sharing_"+rowCounter+"_adder").checked=true;
						setTimeout(function() {updateListMeta(e)},1)
					}
				 })
				theEl.checked = record.editor? true:false;
				newprops = {style:{'text-align':'center'}}
				return dg.makeElement(tag, newprops, theEl);
			},

			'delete': function (tag, props, record, rowCounter) {
				let theEl = dg.span (
				 {	'className':'fa fa-trash',
				 	'style': {'cursor':'pointer','text-align':'center',width:'100%','color':(canEdit?'lightseagreen':'grey'),'font-size':'16px','padding-left':'2px','padding-right':'2px'},
				 	'contentEditable':false,
					'id': "listMeta_sharing_"+rowCounter+"_delete",
					'onclick': function(e) {
						if (canEdit){
							tempChangeRecords.listMeta.sharing.splice(rowCounter,1);
							if (tempChangeRecords.listMeta.sharing.length==0)tempChangeRecords.listMeta.sharing.push({});
							populateListMetaDetails(tempChangeRecords.listMeta, {showSaveButt:true})					
						}
					}
				 })
				return dg.makeElement(tag, props, theEl);
			}
		}
	}

	var viewsTableFilterOptions = function(rowCounter) {
		//onsole.log("viewsTableFilterOptions "+rowCounter)
		return {
			keys: { // shows which fields to show and and not show in the grid
				showThese:['field','symbol','value']
			}, 
			props: { // properties by tag name or field specific
				table: {
					'id':'listMeta_viewsFilterTable_'+rowCounter,
					'className': 'smallTable'
				},
				th: {'style':{'display':'none'}},
				tr: {'className':'smallTableTr'},
				td: {
					'className':'smallTableTd',
					'onkeydown': function(e) {
						if (e.keyCode == 13 || e.keyCode == 9) {
								e.preventDefault();
								let tabSequence = ['field','symbol','value'];
								let parts = e.target.id.split('_')
								//onsole.log(parts)
								let nextTab =  dg.el('listMeta_views_'+parts[2]+'_'+tabSequence [tabSequence.indexOf(parts[3])+(e.shiftKey? -1:1)]);
								if (!nextTab) nextTab = dg.el('listMeta_views_'+(parseInt(parts[2])+ (e.shiftKey? -1:1) )+'_name')
								if (!nextTab) nextTab = dg.el(e.shiftKey? 'listMeta_description':'butt_add_View')
								if (nextTab) nextTab.focus()

						} else {
							e.target.style.color = CHGED_FIELD_COLOR;
							setTimeout(function() {updateListMeta(e)},0)
						}
					},
					'onpaste': function(e) {
						setTimeout(function() {
							e.target.style.color = CHGED_FIELD_COLOR;
							e.target.innerHTML = e.target.innerText;
							updateListMeta(e);
						},0)
					}
				},
				keyspecific: {
					'value': {'contentEditable':canEdit, style: {border:'dotted 1px grey', 'min-width':'50px'}},
					'field': {'contentEditable':canEdit, style: {border:'dotted 1px grey', 'min-width':'50px'}}
				},
	    		id: function(key, record, rowCounterInner) {if (key!="symbol") return "listMeta_views_"+rowCounter+"_filters_"+rowCounterInner+"_"+key}
			},
			transform: {
				'symbol': function(tag, props, record, rowCounterInner) {
					let theEl =  dg.makeElement(tag, props, dg.select({
								'className':'symbolChooser', 
								'disabled':(!canEdit),
								'id':"listMeta_views_"+rowCounter+"_filters_"+rowCounterInner+"_symbol",
								'onchange': function(e) {
									this.style.color = CHGED_FIELD_COLOR;
									setTimeout(function() {updateListMeta(e)},0)
								}
							 }, dg.option(' '), dg.option('='), dg.option('∈'), dg.option('≠')
						))
					setTimeout(function() {dg.el("listMeta_views_"+rowCounter+"_filters_"+rowCounterInner+"_symbol").value=record.symbol},0)
					return theEl
				}
			}
		}
	}
	let listId = (tempChangeRecords.listMeta._id || tempChangeRecords.listMeta.fj_modified_locally)+"";
	let listIdType = tempChangeRecords.listMeta._id?"dbid":"localtemp"
	dg.populate(
			"oneRecordInner", // todo - hide when edit
    		dg.button( {'id':'gotoListFromMeta',
	    			'className': 'fa fa-save mainFaButt',
	    			'style':{'float':'left', 
	    				'display':(viewTransitionSources.newListMetaInputScreen=="showAllLists"?"block":"none")},
	    			'onclick': function() {
	    					closeNewInputScreen();
	    					showListDetails(listId, {'idType':listIdType})
	    			} ,

	    		},
	    		dg.span({'className':'mainFaButtInner'} , 'View List')
    		),
	    	dg.div(
	    		{'style':{
		    		'float':'right',
		    		'padding-right':'40px',
		    		'border-radius':'5px',
		    		'width': '220px',
		    		'text-align':'right'
	    		}}, 
	    		dg.button( {'id':'butt_saveNewInputScreen_1',
		    			'className': 'fa fa-save mainFaButt',
		    			'style':{'display': options.showSaveButt?'inline-block':'none'},
		    			'onclick': clickSavelistMetaForm
		    		},
		    		dg.span({'className':'mainFaButtInner'} , 'Save Changes')
	    		),
	    		dg.button( {'id':'butt_close_newInputScreen',
	    			'className': 'fa fa-close mainFaButt',
	    			'onclick': closeNewInputScreen},
		    		dg.span({'className':'mainFaButtInner'} , 'Close')
	    		)
	    	),
	    	dg.div({style:{'line-height':'110%','text-align':'left','font-size':'18px','font-weight':'bold', 'padding': '5px 0px 20px 130px'}},'List Parameters'),
	    	dg.table( 
	    		[
	    			{title:"List Name:", value:listMetaData.name,'id':'listMeta_name'},
	    			{title:"Description:"   , value:listMetaData.description,'id':'listMeta_description'},
	    			{title:"Tags:"   , value:listMetaData.tags,'id':'listMeta_tags'},
	    			{title:"tempUniqueId:"   , value:(listMetaData._id || listMetaData.tempUniq),'id':'listMeta_tempUniqueId'}
	    		],
	    		topTableOptions
	    	),

	    	dg.hr(),
	    	dg.h2("Fields"),
	    	dg.table(
	    		listMetaData.fields,
	    		fieldsTableOptions
	    	),
	    	dg.div(dg.button({'id':'butt_add_Field',
	    			'className': 'fa fa-plus mainFaButt',
	    			'style': {'display': (canEdit?"block":"none")},
	    			'onclick': function (e) {
	    				tempChangeRecords.listMeta.fields.push({'listoryFieldIsNew':'new'});
	    				dg.el('listMeta_fieldsTable').appendChild(dg.row({},fieldsTableOptions,tempChangeRecords.listMeta.fields.length-1))
	    				dg.el("listMeta_fields_"+(tempChangeRecords.listMeta.fields.length-1)+"_name").focus()
	    			}
	    		},
	    		dg.span({'className':'mainFaButtInner'} , 'Add a Field')
	    		)),

	    	dg.hr(),
	    	dg.h2("Views"),
	    	dg.table(
	    		listMetaData.views,
	    		viewsTableOptions
	    	),
	    	dg.div(dg.button({'id':'butt_add_View',
	    			'className': 'fa fa-plus mainFaButt',
	    			'style': {'display': (canEdit?"block":"none")},
	    			'onclick': function (e) {
	    				tempChangeRecords.listMeta.views.push({'filters':[]});
	    				dg.el('listMeta_viewsTable').appendChild(dg.row({},viewsTableOptions,tempChangeRecords.listMeta.views.length-1))
	    				dg.el("listMeta_views_"+(tempChangeRecords.listMeta.views.length-1)+"_name").focus()
	    			}
	    		},
	    		dg.span({'className':'mainFaButtInner'} , 'Add a View')
	    		)),

	    	dg.hr(),

	    	dg.h2("Sharing"),
	    	(tempChangeRecords.listMeta.type == "new")?
		    	dg.div({style:{color:'grey'}},"Please save list before adding sharing options")
		    	: dg.table(
		    		listMetaData.sharing,
		    		sharingTableOptions
		    	),
	    	dg.div(dg.button({'id':'butt_add_Sharing',
	    			'className': 'fa fa-plus mainFaButt',
	    			'style': {'display': (canEdit && tempChangeRecords.listMeta.type != "new"?"block":"none")},
	    			'onclick': function (e) {
	    				if (!tempChangeRecords.listMeta.sharing) tempChangeRecords.listMeta.sharing = []
	    				tempChangeRecords.listMeta.sharing.push({});
	    				dg.el('listMeta_sharingTable').appendChild(dg.row({},sharingTableOptions,tempChangeRecords.listMeta.sharing.length-1))
	    				dg.el("listMeta_sharing_"+(tempChangeRecords.listMeta.sharing.length-1)+"_name").focus()
	    			}
	    		},
	    		dg.span({'className':'mainFaButtInner'} , 'Share with someone new')
	    		)),

	    	dg.hr(),
	    	dg.h2({style:{'color':'grey'}}, "Import data"),
	    	dg.div({style:{'color':'grey'}}, "(Coming Soon)"),

	    	dg.hr(),
	    	dg.h2({style:{'color':'grey'}}, "Add an icon"),
	    	dg.div({style:{'color':'grey'}}, "(Coming Soon)"),

	    	dg.hr(),
	    	dg.div(
	    		{'style':{
	    			'min-width':'100%',
	    			'text-align':'center'
	    		}},
	    		dg.button( {
	    				'id':"butt_saveNewInputScreen_2",
		    			'className': 'fa fa-save mainFaButt',
		    			'style':{'display':options.showSaveButt?'inline-block':'none'},
		    			'onclick': clickSavelistMetaForm
		    		},
		    		dg.span({'className':'mainFaButtInner'	} , 'Save Changes')
	    		),	    		
	    		dg.button( {
	    				'id':"butt_deleteList_2",
		    			'className': 'fa fa-save mainFaButtRed',
		    			'onclick': deleteList,
		    			'style': {'display': (canEdit?"inline-block":"none")},
		    		},
		    		dg.span({'className':'mainFaButtInnerRed'} , 'Delete List')
	    		),
	    	)
	);	
}
var closeNewInputScreen = function () {
	//onsole.log("closeNewInputScreen")
	if (viewTransitionSources.type == 'newListMetaInputScreen') {
		if (listoryIsSyncing() ) {
			showWarning("Please wait until syncing is over to create a new list")
		} else {
			viewTransitionTo("newListMetaInputScreen", {doClose:true, 'source':'close'});
			tempChangeRecords.listMeta = null;
		}
	} else {
		viewTransitionTo(viewTransitionSources.type, {doClose:true, 'source':'close'});		
	}
}

// List Meta Actions
var updateListMeta = function(e) { // On List Meta form, this updates tempChangeRecords.listMeta from html content
	if (tempChangeRecords.listMeta._owner && tempChangeRecords.listMeta._owner != freezr_user_id) return null;
	if (!e || ! e.target || !e.target.id) return null; // error
	let changePath = e.target.id.split('_'); // eg listMeta_fields_0_displayName
	let content = e.target.innerText? e.target.innerText: (e.target.value? e.target.value:"" );
	dg.el('butt_saveNewInputScreen_1').style.display = "inline-block";
	dg.el('butt_saveNewInputScreen_2').style.display = "inline-block";
	dg.el('gotoListFromMeta').style.display = "none";
	switch(changePath[0]) {
		case 'listMeta':
			if (["name","description","tags"].indexOf(changePath[1]) >-1 ) {
				tempChangeRecords.listMeta[changePath[1]] = content;
				if (changePath[1]=="name" && !tempChangeRecords.listMeta._id) {
					tempChangeRecords.listMeta.tempUniqueId= conformListmetaName(content.toLowerCase());
					dg.el("listMeta_tempUniqueId").innerText=tempChangeRecords.listMeta.tempUniqueId;
				} else if (changePath[1]=="tags") {
					tempChangeRecords.listMeta[changePath[1]] = content.split(" ");
				}
			} else if (["views","fields"].indexOf(changePath[1]) >-1 ) {
				if (changePath[1]=="views" && changePath[3] =="filters") {
					tempChangeRecords.listMeta.views[parseInt(changePath[2])].filters[parseInt(changePath[4])][changePath[5]] = content;
					// todo - check value of filter is a field
				} else if (changePath[1]=="fields" && ["main"].indexOf(changePath[3]) >-1 ) {
					tempChangeRecords.listMeta[changePath[1]] [parseInt(changePath[2])][changePath[3]] = e.target.checked;
				} else {
					tempChangeRecords.listMeta[changePath[1]] [parseInt(changePath[2])][changePath[3]] = content;
				}
			} else if (changePath[1] == "sharing") {
				if (changePath[3]=="name") {
					tempChangeRecords.listMeta[changePath[1]] [parseInt(changePath[2])][changePath[3]] = content;
				} else { // rest are boolean
					tempChangeRecords.listMeta[changePath[1]] [parseInt(changePath[2])][changePath[3]] = e.target.checked;
				}
			}
		break;
		default:
			 console.log('undefined id ')
	}
}
var clickSavelistMetaForm = function (e) {
	if (tempChangeRecords.listMeta._owner && tempChangeRecords.listMeta._owner != freezr_user_id) {
		console.warn("Cannot save list meta in another person's form")
	} else {
		let listMeta_index = -1;

		let errorChecksOnlistMeta =  {'allOkay':true,'errors':{},'changedFieldNames':[]};

		// verify field names
		if (tempChangeRecords.listMeta.fields && tempChangeRecords.listMeta.fields.length>0) {
			for (let i=0;i<tempChangeRecords.listMeta.fields.length; i++) {
				tempChangeRecords.listMeta.fields[i].name = tempChangeRecords.listMeta.fields[i].name? tempChangeRecords.listMeta.fields[i].name.trim() : "";
				let verifiedNameResults = verifyFieldName(tempChangeRecords.listMeta.fields[i].name);
				if (i>0) {
					for (let j=0; j<i; j++) {
						if (tempChangeRecords.listMeta.fields[i].name == tempChangeRecords.listMeta.fields[j].name ) {
							tempChangeRecords.listMeta.fields[i].name = incrementName(tempChangeRecords.listMeta.fields[i].name);
							j=0;
						}
					}
				}
				if (verifiedNameResults.changed) {
					errorChecksOnlistMeta.allOkay = false;
					errorChecksOnlistMeta.changedFieldNames.push(tempChangeRecords.listMeta.fields[i].name+"")
					tempChangeRecords.listMeta.fields[i].name = verifiedNameResults.newName;
				};
			}
		}
		
		// verify showFields
		for (let i= 0; i<tempChangeRecords.listMeta.views.length; i++) {
			let theView = tempChangeRecords.listMeta.views[i];
			if (theView.showFields) {
				let fields = listfromCSV(theView.showFields);
				let isAfieldName = function(aName) {
					tempret = false
					tempChangeRecords.listMeta.fields.forEach(fieldRef => {if (fieldRef.name == aName) tempret=true})
					return tempret;
				}
				for (let j=fields.length-1; j>=0; j--) {
					if (fields[j] == 'date') {
						fields[j] = "listoryDate"
					} else if (fields[j] != 'listoryDate' && !isAfieldName(fields[j])) {
						fields.splice(j,1)
					}
				}
				tempChangeRecords.listMeta.views[i].showFields = fields.join(", ")
			}
		}

		// views
		for (let i= 0; i<tempChangeRecords.listMeta.views.length; i++) { 
			let theFilters = tempChangeRecords.listMeta.views[i].filters;
			if (theFilters && theFilters.length>0) {
				for (let j=theFilters.length-1; j>=0; j--) {
					if ((!theFilters[j].field || theFilters[j].field.trim() == "") && (!theFilters[j].value || theFilters[j].value.trim() == "")) theFilters.splice(j,1)
				}
			}
		}

		if (errorChecksOnlistMeta.allOkay){	
			// clean up
			if (tempChangeRecords.listMeta.fields && tempChangeRecords.listMeta.fields.length>0) {
				for (let i=0;i<tempChangeRecords.listMeta.fields.length; i++) {
					if (tempChangeRecords.listMeta.fields[i].listoryFieldIsNew) {
						theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
						if (theView && theView.showFields && theView.showFields.trim().length>0 ) {
							theView.showFields= theView.showFields+", "+tempChangeRecords.listMeta.fields[i].name
							listory.save()
						}
					} 
					delete tempChangeRecords.listMeta.fields[i].listoryFieldIsNew;
				}
			}

			for (var i=0; i<listory.data.listMeta.length; i++) {
				let madeChange = false
				let listRecord = listory.data.listMeta[i];
				while (listRecord.fj_local_temp_unique_id != tempChangeRecords.listMeta.fj_local_temp_unique_id &&  listRecord.tempUniqueId == tempChangeRecords.listMeta.tempUniqueId || listRecord._id == tempChangeRecords.listMeta.tempUniqueId) {
					madeChange = true;
					tempChangeRecords.listMeta.tempUniqueId = incrementName(tempChangeRecords.listMeta.tempUniqueId+"");
				}
				if (madeChange == true) i=0;
			}

			if (tempChangeRecords.listMeta.type == "new") {
				delete tempChangeRecords.listMeta.type;
				let theList = listory.add('listMeta',tempChangeRecords.listMeta);
				let feedRec = {
					listoryId: theList.fj_local_temp_unique_id,
					listoryIdType: "localtemp", 
					accepted: true,
					rejected: false,
					recordId: null,
					recordIdType: null,
					changedRecords: null,
					changedMeta: JSON.parse(JSON.stringify(theList)),
					notes:"list created"
				}
				listory.add("feed",feedRec)
				shownList.lastFeedChged = null;
				doPreSyncOfUniqueIds(function(returnJson) {
					if (returnJson && returnJson.error) {
						showWarning("Problem connecting to server")
					} else {
						listory.save();
						tempChangeRecords.listMeta._id = shownList.listoryId; // this is set in 
						viewTransitionTo("newListMetaInputScreen", {doClose:true, source:'save'});
						showListDetails(shownList.listoryId,{idType:"dbid"})
						if (!listory.data.shareSyncListStatus)listory.data.shareSyncListStatus=[];
						if (tempChangeRecords.listMeta.sharing && tempChangeRecords.listMeta.sharing.length>0 ){
							tempChangeRecords.listMeta.sharing.forEach(sharedObj => {if (sharedObj.name) listory.data.shareSyncListStatus.push ({'userid':sharedObj.name,'listoryId':tempChangeRecords.listMeta._id, 'grant':true, 'progress':null})})
						}
						tempChangeRecords.listMeta = null;
					}
				})

			} else {
				let oldListIdx = listory.idIndex("listMeta",tempChangeRecords.listMeta);
				let sharedItemsComp = compareLists(listFromJSONlist(tempChangeRecords.listMeta.sharing,"name"), listFromJSONlist(listory.data.listMeta[oldListIdx].sharing,"name"));
				if (!listory.data.shareSyncListStatus)listory.data.shareSyncListStatus=[];
				sharedItemsComp.in1Only.forEach(aNewName => {
					existingIdx = firstIdxInList(listory.data.shareSyncListStatus, {'userid':aNewName,'listoryId':tempChangeRecords.listMeta._id})
					if (existingIdx>-1) listory.data.shareSyncListStatus.splice(existingIdx,1)
					listory.data.shareSyncListStatus.push ({'userid':aNewName,'listoryId':tempChangeRecords.listMeta._id, 'grant':true, 'progress':null})
				})
				sharedItemsComp.in2Only.forEach(aNewName => {
					existingIdx = firstIdxInList(listory.data.shareSyncListStatus, {'userid':aNewName,'listoryId':tempChangeRecords.listMeta._id})
					if (existingIdx>-1) listory.data.shareSyncListStatus.splice(existingIdx,1)
					listory.data.shareSyncListStatus.push ({'userid':aNewName,'listoryId':tempChangeRecords.listMeta._id, 'grant':false, 'progress':null});
					let metaChange = makeNewChangeitem("removeUserFromList", {'userid':aNewName,'listoryId':tempChangeRecords.listMeta._id, 'grant':false, '_owner':freezr_user_id});
				})
				
				delete tempChangeRecords.listMeta.type;
				let theList = listory.updateFullRecord('listMeta',tempChangeRecords.listMeta);

				let feedRec = {
					listoryId: theList._id || theList.fj_local_temp_unique_id,
					listoryIdType: theList._id? "dbid":"localtemp", 
					accepted: true,
					rejected: false,
					recordId: null,
					recordIdType: null,
					changedRecords: null,
					changedMeta: JSON.parse(JSON.stringify(theList)),
					notes:"list changed"
				}
				listory.add("feed",feedRec)
				shownList.lastFeedChged = null;

				saveListory();
				viewTransitionTo("newListMetaInputScreen", {doClose:true, source:'save'});
				tempChangeRecords.listMeta = null;
				setTimeout(trySyncing,100);
			}
		} else {
			populateListMetaDetails(tempChangeRecords.listMeta, {showSaveButt:true})
			showWarning("Some field names were changed to conform to rules. (Spaces, undescores and @ signs not allowed. Please review the following and try saving again: "+errorChecksOnlistMeta.changedFieldNames.join(', ') ,4000)
		}
	}
}
var deleteList = function(e) {
	//onsole.log(tempChangeRecords.listMeta);
	if (confirm("Are you sure you want to delete '"+tempChangeRecords.listMeta.name+"'")) {
		let theId = (tempChangeRecords.listMeta._id || tempChangeRecords.listMeta.fj_local_temp_unique_id)
		let idType = tempChangeRecords.listMeta._id? "dbid":"localtemp";
		let theList = listory.markDeleted("listMeta", theId, {'removeAllFields':false, 'idType':idType});
		if (theList){
			let feedRec = {
				listoryId: theId,
				listoryIdType: idType, 
				accepted: true,
				rejected: false,
				recordId: null,
				recordIdType: null,
				changedRecords: JSON.parse(JSON.stringify(theList)),
				notes:"list deleted"
			}
			listory.add("feed",feedRec)
			shownList.lastFeedChged = null;

			viewTransitionTo("newListMetaInputScreen", {doClose:true, source:'delete'});	
			showAllLists();
			// cleanup later: consider also marking records and feeds as belonging to a deleted list

		} else {showWarning("Internal Error: Could not find list to delete.",3000)}
	}
}
// List Meta Utility functions
const INVALID_CHARS = [' ','_','@','.']
const INVALID_FIELD_NAMES = ['date']
var conformListmetaName = function(aName) {
	// cleanup: use INVALID_CHARS to dynamically change this
	let tempret = aName.replace(/ /g,"").replace(/_/g,"").replace(/@/g,"").trim();
	let dotindex = aName.indexOf(".");
	while (dotindex>-1) {aName=aName.slice(0,dotindex)+aName.slice(dotindex+1); dotindex = aName.indexOf(".");}
	if (tempret.indexOf("listory") == 0) tempret = "a"+tempret;
	if (tempret.indexOf("date") == 0) tempret = "a"+tempret;
	return tempret;
}
var verifyFieldName = function(aName) {
	tempret = {changed:false, newName:""}
	INVALID_CHARS.forEach(aChar => {if (aName.indexOf(aChar)>-1) tempret.changed = true;})
	if (aName.indexOf("listory") == 0) {tempret.changed = true;}
	if (aName.indexOf("date") == 0) {tempret.changed = true;}
	if (aName == "") {tempret.changed = true; tempret.newName ="aField"}
	if (tempret.changed) tempret.newName = conformListmetaName(aName)
	return tempret;
}
var getChoiceListFromListMeta = function(aParam) {
	let theIdx = getListIdxByParam(aParam,shownList.listMeta.fields,'name')
	if (theIdx<0) {
		return -1;
	} else {
		let tempret = []
		shownList.listMeta.fields[theIdx].typedetails.split(',').forEach(anel => {tempret.push(anel.trim())})
		return tempret 
	}
}

// LIST DETAILS
var iniitalizeShownList = function () {
	// todo cleanup - merge this and initialiseListDetails
	return {
		listMeta :  null,			// replica of list meta data
		listoryId: 	null,			// temporary or permanenet id of list
		listoryIdType: null,		// ..
		showTheseKeys:  [],			// keys to be shown - based on views
		headers: 	{},				// headers details, based on view
		headerTitles:   {},			// titles of headers - derived from listmeta
		
		sums: {},					// sums of various keys
		lastRecChgId: null,
		lastFeedChged: null, 		// used to reduce search time for the feed object
		lastRowNum: -1,				// perhaps unnecsessary!?

		saveTimeout: null,
		syncTimeout: null,
		updateSumsTimeout: null,

		recordsShown: []			// replica of all filtered sorted data
	}
};
var shownList = iniitalizeShownList();

var showListDetails = function(id,listOptions, sortOptions, viewOptions, otherOptions={}){
	//onsole.log("showListDetails "+id)
	if (typeof id != "string") {id=undefined;}
	if (initialiseListDetails(id,listOptions)) {
		shownList.mainPanelNowShowing = "listDetails";
		setUrlHistory()
		if (!otherOptions.doNotRefreshHeaders) initialiseListDetailHeaders();

		filterList();
		sortShownList(sortOptions);
		showAllRecords(viewOptions);
		getOlderRecordsOnline(null, {noWarning:true,syncAtEnd:true})
	} else {
		showWarning("Error: Could not access list data",5000)
		showAllLists();
	}
}
var refreshListDetails =function(){
	showListDetails(shownList.listoryId,{idType:shownList.listoryIdType}, {}, {}, {doNotRefreshHeaders:true})
}

var initialiseListDetails = function(id=shownList.listoryId, options={idType:shownList.listoryIdType}){
	// options - idType, viewNum or viewName
	// initializes 
	//onsole.log("initialiseListDetails",id,options)

	shownList.mainPanelNowShowing = "listDetails";

	shownList.listMeta = listory.get('listMeta', id, {idType:options.idType})

	if (! shownList.listMeta) {
		return false;		
	} else { 

	// Initializes shownList and shownList headers

		shownList.listoryId = idFromRec(shownList.listMeta);
		shownList.listoryIdType = shownList.listMeta._id? "dbid":"localtemp";
		shownList.lastRowNum =  -1;
		let viewNum= undefined;

		if (!listory.data.listoryViews) listory.data.listoryViews = {};

		let theView;
		if (options.viewNum != undefined && !isNaN(options.viewNum)) {
			viewNum = options.viewNum;
		} else if(options.viewName) {
			viewNum = indexInList('name', options.viewName, shownList.listMeta.views)
			if (viewNum <0) viewNum= undefined
		}
		if (viewNum == undefined && !listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]) viewNum=0;
		if (viewNum != undefined) {
			listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]  = JSON.parse( JSON.stringify( shownList.listMeta.views[viewNum]));
			listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType].originalViewNum = viewNum;
			listory.save()
		}
		theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
		
		shownList.headers = {'listoryExpander':' ','listorySave':' ', 'listoryDate':' '};
		shownList.headerTitles = {};

		let allFields = shownList.listMeta.fields;

		//onsole.log(allFields)
		let filedsToShowAreDefined = false;
		if (theView.showFields) {
			shownList.showTheseKeys = listfromCSV('listoryExpander, '+theView.showFields)
			filedsToShowAreDefined = true;
			//onsole.log("filedsToShowAreDefined is true")
		} else {		
			shownList.showTheseKeys = ['listoryExpander', 'listoryDate'];
		}
		shownList.widths = {'listoryExpander':'10px','listorySave':'16px','listoryDate':'50px'};
		allFields.forEach(function (fieldDef) { 
			shownList.headers[fieldDef.name] = dg.span({style:{'min-width':'100px'}},
				dg.div({
					id:"headerSorter_"+fieldDef.name,
					className:"headsorter fa fa-chevron-right", 
					onclick:SortTable}), 
				dg.span({className:'headName'}, (fieldDef.displayName || fieldDef.name)));
			if (shownList.headerTitles[fieldDef.name]) shownList.headerTitles[fieldDef.name] = fieldDef.description;
			if (!filedsToShowAreDefined && theView != undefined && ( (!theView.dontShow || theView.dontShow.indexOf(fieldDef.name)<0) ) ) shownList.showTheseKeys.push(fieldDef.name);
		});
		shownList.headers['listoryDate'] = dg.span({style:{'min-width':'30px'}},
				dg.div({
					id:"headerSorter_listoryDate",
					className:"headsorter fa fa-chevron-right", 
					onclick:SortTable}), 
				dg.span({className:'headName'}, "Date"));
				shownList.headerTitles['listorySave'] = 'last Modified Date of Record';
		shownList.showTheseKeys.push('listorySave')

		shownList.myRights = {
			'canAdd':userAllowedToAddToShownList(freezr_user_id),
			'canEdit': userAllowedToEditInShownList(freezr_user_id)
		}

		return true;		
	}
}
var setUrlHistory = function (panel) {
		history.pushState(null, null, 'index.html?'+(shownList.listoryId?'id='+shownList.listoryId+'&type='+(shownList.listoryIdType || ''):'')+(panel?((shownList.listoryId?'&':'')+'panel='+panel):"") );
}
var initialiseListDetailHeaders = function () {
		// SET UP Table headers
		dg.el('mainDiv', {'clear':true}).appendChild(
			dg.div({'id':'listDetailHolder'},
				dg.div({style:{'white-space':'nowrap'}}, 
					dg.span({className:'fa fa-th clickable',
							 'title':'See All Lists',
							 'id':'click_allLists_2'}),
					//),
					dg.span({className:'mainListName', style: {'margin-left':'5px', 'white-space': 'nowrap'}},
							shownList.listMeta.name || "Un-named list"),
					dg.span({className:'mainListDesc', style: {'margin-left':'5px', 'white-space': 'nowrap'}},
							shownList.listMeta.description || " "),
				),
				dg.div(
					{style:{'margin-bottom':'5px','margin-top':'5px','padding-right':'50px','text-align':'left','text-align':'right','display':'inline-block','padding-left': '15px'}}, 
					dg.button({className:'smallButt padded smallFaButtText clickable', 
							   onclick: showCurrentListMeta
							}, "All Options"
					),
					dg.button({className:'smallButt padded',
						id:'butt_mainTable_AddRow_2',
						style:{'display': (shownList.myRights.canAdd?'inline-block':'none')},
						onclick:addNewBlankRow,
						},
						dg.span({className:'fa fa-plus clickable'}),
						dg.span({className:'smallFaButtText clickable'},
								 'New Rec')
					),
					dg.button({className:'smallButt padded',
							id:'click_saveAllRecs_0'},
						dg.span({className:'fa fa-save clickable',
								 'title':'Save Current',
								 'id':'click_saveAllRecs_1'}),
						dg.span({className:'smallFaButtText clickable',
								 'id':'click_saveAllRecs_2'},
								 "Save All")
					),
					dg.button({className:'smallButt padded',
							onclick: function () {showFeedView()}},
						dg.span({className:'fa fa-list clickable',
								 'title':'Feed View'}),
						dg.span({className:'smallFaButtText clickable'},
								 "Feed")
					),
					dg.div({className:'menuDropdown', style:{'display':'none'}}, 
						dg.button({className:'smallButt padded smallFaButtText clickable menuDropdownButt', 
								   onclick: function(){ toggleMenu(dg.el("optionsDropdown")) }
								},"Options"
						),
						dg.div({id:"optionsDropdown", className:"dropdown-content menuNoshow"},
							dg.span("Add menu items later??"),
						),
					),
					dg.div({className:'menuDropdown'}, 
						dg.button({className:'padded smallFaButtText clickable menuDropdownButt', 
								   onclick: function(){ 

								   	if (dg.el("fieldsDropdown").classList.contains("menuNoshow")) {
								   		let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
								   		let dd = dg.el("fieldsDropdown",{'clear':true})
								   		let shownFieldList = listfromCSV(theView.showFields)
								   		dd.appendChild(dg.span({
								   			onclick: function () {
								   				shownList.listMeta.fields.forEach(aField => {shownFieldList = addToListAsUnique(shownFieldList, aField.name)})
								   				shownFieldList = addToBeginningOfListAsUnique(shownFieldList,"listoryDate");
								   				theView.showFields = shownFieldList.join(", ");
								   				listory.save();
								   				showListDetails();
								   			}}, "Show All"))
								   		dd.appendChild(dg.hr())
								   		let fieldCheckerDiv = function (aField, checked) {
								   			return dg.div({style:{'width':"100%", 'padding-bottom':'5px', 'padding-left':'2px', 'cursor':'default'}},
									   				dg.makeElement('input',
													 {	'type':'checkbox',
														 'checked':checked,
														 'className':'dropDownKeep',
													 	 'style': {'float':'right','cursor':'pointer'},
														 'onchange': function(e) {
														 	let shownFieldList = listfromCSV(theView.showFields);
														 	if (e.target.checked) {
														 		if (aField == 'listoryDate') {
														 			shownFieldList = addToBeginningOfListAsUnique(shownFieldList,"listoryDate");
														 		} else {
														 			shownFieldList = addToListAsUnique(shownFieldList, aField)
														 		}
														 	} else {
														 		shownFieldList = shownFieldList.filter(item => item !== aField)
														 	}
														 	theView.showFields = shownFieldList.join(", ");
														 	listory.save();
								   							refreshListDetails();
														 }
													 })
								   				, displayNameFromFieldName (aField) )
								   		}
								   		listfromCSV(theView.showFields).forEach(aField => {
								   			dd.appendChild(fieldCheckerDiv(aField, true))
								   		})
								   		dd.appendChild(dg.hr())
								   		shownList.listMeta.fields.forEach(aField => {if (!shownFieldList.includes(aField.name)) dd.appendChild(fieldCheckerDiv(aField.name, false)) })
								   		dd.appendChild(dg.hr())
								   		dd.appendChild(dg.span({
								   			onclick: function () {
								   				showWarning("Coming soon",3000)
								   			}}, "Add a field"))

								   	}
								   	toggleMenu(dg.el("fieldsDropdown"))
								   }
								},"Fields"
						),
						dg.div({id:"fieldsDropdown", className:"dropdown-content menuNoshow"})
					),
					dg.div({className:'menuDropdown'}, 
						dg.button({className:'padded smallFaButtText clickable menuDropdownButt', 
								   onclick: function(){ 
								   	if (dg.el("viewsDropdown").classList.contains("menuNoshow")) {
								   		let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
								   		let dd = dg.el("viewsDropdown",{'clear':true})
								   		dd.appendChild(dg.span({
								   			onclick : function() {
								   				let listMeta = listory.get('listMeta', shownList.listoryId, {idType:shownList.listoryIdType})
								   				listMeta[theView.originalViewNum] = JSON.parse(JSON.stringify(theView))
								   				listory.save();
								   			}
								   		},"Update view: '"+theView.name+"'"))
								   		dd.appendChild(dg.span({
								   			onclick: function() {
								   				let listMeta = listory.get('listMeta', shownList.listoryId, {idType:shownList.listoryIdType})
								   				theView.originalViewNum = listMeta.views.length;
								   				theView.name = listMeta.views.length+"- "+theView.type
								   				listMeta.views.push(JSON.parse(JSON.stringify(theView)));
								   				listory.save();								   			}
								   		}, "Save as new view"))
								   		dd.appendChild(dg.hr())
								   		dd.appendChild(dg.div({'style':{'font-size':'8px','color':'darkgrey'}}," Change view type..."))
								   		
								   		GRID_TYPES.forEach (gridType => {
								   			if (gridType != theView.type) {
								   				dd.appendChild(dg.span({
								   					onclick: function() {
								   						theView.type = gridType;
								   						showListDetails();
									   					listory.save();
								   					}
								   				},gridType))
								   			}
								   		})
								   		dd.appendChild(dg.hr())
								   		dd.appendChild(dg.div({'style':{'font-size':'8px','color':'darkgrey'}}," Go to saved view..."))
								   		for (let i=0; i<shownList.listMeta.views.length; i++) {
								   			aView = shownList.listMeta.views[i];
								   			dd.appendChild(dg.span({
								   				onclick: function () {
								   					showListDetails(shownList.listoryId, {idType:shownList.listoryIdType,
								   						viewNum:(i)
								   					});
								   					listory.save();
								   				}
								   			},aView.name))
								   		}
								   	}
								   	toggleMenu(dg.el("viewsDropdown"))
								   }
								},"Views"
						),
						dg.div({id:"viewsDropdown", className:"dropdown-content menuNoshow"})
					),


					dg.div( {"id":"lsSearchsRow", style:{margin:'0',padding:'0',float:'right',overflow:'scroll', 'display':'inline-block', 'max-width':'600px' } }, 
						dg.div({'id':'lsSearchBox',
								contentEditable: true,
								'onkeydown': function(e) {if (e.keyCode == 13 || e.keyCode == 9) {
									e.preventDefault();
									searchFromSearchString(dg.el('lsSearchBox').innerText);
								}},
								'style':{'min-width':'100px', 'display':'inline-block','border':'1px grey dotted', 'font-size':'11px','padding-right': '5px', 'white-space':'nowrap', 'text-align':'left', 'max-width':'400px'}}),
						dg.button({'className':'smallButt padded smallFaButtText clickable',
								 onclick: function() { searchFromSearchString(dg.el('lsSearchBox').innerText);}},
							"search"),
						dg.span({style:{'color':'grey','font-size':'10px','margin-left':'5px'}},"(To filter, use =,≠ or ∈.)")
					)
/*
	if (!searchRow) {
	dg.el('lsSearchBox',{'clear':true}).innerText= searchTextFromViewFilter()  ;
*/

				),
				
				dg.div({'id':'listDetails'}),


				dg.button({className:'smallButt padded',
						id:'butt_mainTable_AddRow_2',
						style:{'padding-top':'5px', 'display':(!shownList.myRights.canAdd || viewGridIsListView() || viewGridTableIsFixed())? "none":"inline-block"},
						onclick:addNewBlankRow,
						},
						dg.span({className:'fa fa-plus clickable'}),
						dg.span({className:'smallFaButtText clickable'},
								 'New Record')
					),
				dg.button({className:'smallButt padded',
						id:'butt_mainTable_moreOnline',
						onclick:getOlderRecordsOnline,
						},
						dg.span({className:'fa fa- clickable'}),
						dg.span({className:'smallFaButtText clickable'},
								 'More Online')
					),

			)
		)	
}
var getOlderRecordsOnline = function(e, options={}) {
	// todo - add filter as part of query
	//onsole.log("getting older records from "+(new Date (options.lastOldest)))
	listory.getOlderItems("records",{
		'addToJlos':true,
		'permissionName':'list_share',
		'queryParams':{'listoryId':shownList.listoryId},
		'lastOldest': (options.lastOldest || new Date().getTime()),
		'warningCallBack': function(returnJson) {showWarning((returnJson.msg || ("error: "+returnJson.error)),5000 )},
		'downloadedItemTransform': handleDownloadedRecordItem,
		'endCallBack': function(newItems,state) {
			if (newItems.length>0) showListDetails();
			if (state.noMoreItems) {
				if (dg.el("butt_mainTable_moreOnline")) dg.el("butt_mainTable_moreOnline").style.display="none";
				if (!options.noWarning) showWarning("No more items online.",1000);
				getAllUnsavedFeedItemsOnline(null, {
				syncAtEnd:options.syncAtEnd, noWarning:options.noWarning
			});
			} else {
				options.lastOldest = state.lastOldest;
				setTimeout( function() {getOlderRecordsOnline(null, options)},0)
			} 
		},
		'numItemsToFetchOnStart': NUM_LISTS_TO_DOWNLOAD
	})
}
var getAllUnsavedFeedItemsOnline = function(e, options={}) {
	// todo later - for many unsaved changes this is quite inefficient
	//onsole.log("getting older feed items from "+(new Date (options.lastOldest)))
	//onsole.log("getAllUnsavedFeedItemsOnline")
	listory.getOlderItems("feed",{
		'addToJlos':true, 
		'permissionName':'list_share',		
		'queryParams':{'listoryId':shownList.listoryId,'$and':[notexistsOrQuery('accepted'),notexistsOrQuery('rejected') ] },
		'lastOldest': (options.lastOldest || new Date().getTime()),
		'warningCallBack': function(returnJson) {showWarning((returnJson.msg || ("error: "+returnJson.error)),5000 )},
		'downloadedItemTransform': handleDownloadedRecordItem,
		'endCallBack': function(newItems,state) {
			if (newItems.length>0) showListDetails();
			if (!state.noMoreItems) {
				setTimeout( function() {
					options.lastOldest = state.lastOldest;
					getAllUnsavedFeedItemsOnline(null, options)},0)
			} else if (!options.syncAtEnd) {
				trySyncing();
			}
		},
		'numItemsToFetchOnStart': NUM_LISTS_TO_DOWNLOAD
	})
}
var notexistsOrQuery = function(param) {
	let j1 = {}
	j1[param]={$exists:false}
	let j2 = {}
	j2[param]=false
	return {'$or':[j1,j2]}
}

var filterList = function () {
	let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]

	if (theView.filters && theView.filters.length>0) {
		theView.filters.forEach(aFilter => {
			let filterValue = aFilter.value;
			if (typeof(filterValue) === "string") filterValue = filterValue.trim();
			if (filterValue === undefined) {
				if (aFilter.paramType=="boolean") filterValue=false;
				if (aFilter.paramType != "multichoice") filterValue="";
			}
		});
	}

	shownList.othersChanges = {'saveOthersFeed':{},'saveOthersRec':{}};
	if (listory.data.changes && listory.data.changes.length>0) {
		listory.data.changes.forEach(aChangeRec => {
			if (aChangeRec.listoryId == shownList.listoryId && !aChangeRec.closed && (aChangeRec.type=="saveOthersFeed" ||aChangeRec.type=="saveOthersRec")) {
				shownList.othersChanges[aChangeRec.type][aChangeRec.type== 'saveOthersFeed'? aChangeRec.feedId : aChangeRec.recordId ] = aChangeRec;
				if (aChangeRec.type== 'saveOthersFeed') {
					if (!shownList.othersChanges['saveOthersRec'][aChangeRec.recordId]) shownList.othersChanges['saveOthersRec'][aChangeRec.recordId]= {changes:{}}
					shownList.othersChanges['saveOthersRec'][aChangeRec.recordId].changes.listoryDate =  aChangeRec.listoryDate;
				}

			} 
		})
	}
	shownList.recordsShown = [];
	shownList.sums = {}
	if (listory.data.records && listory.data.records.length>0) {
		listory.data.records.forEach(function(record) {
			//onsole.log(record)
			if (record.listoryId == shownList.listoryId && !record.fj_deleted) {
				// do filters here
				let doShow = true;
				theView.filters.forEach(aFilter => {
					let recordValue = record[aFilter.field];
					if (typeof(recordValue) === "string") recordValue = recordValue.trim();
					if (recordValue === undefined) {
						if (aFilter.paramType=="boolean") recordValue= false;
						if (aFilter.paramType != "multichoice") recordValue="";
					}
					switch (aFilter.symbol) {
						case '=':
							if (recordValue != aFilter.value ) doShow = false;
							break;
						case '∈':
							let terms = aFilter.value.split(" ")
							let noneArePresent = true
							terms.forEach(aTerm => {
								if (recordValue && recordValue.indexOf(aTerm.trim())>-1) noneArePresent= false;
							})
							if (noneArePresent) doShow=false;
							break;
						case '≠':
							if (!(aFilter.value===undefined && recordValue===undefined) && (recordValue == aFilter.value) )doShow= false;
							break;
						default:
							break;
					}
				})
				if (doShow) {
					hasSearchItems = true;
					if (theView.searchItems && theView.searchItems.length>0) {
						theView.searchItems.forEach(aSearchItem => {
							let foundInRecord = false;
							Object.keys(record).forEach(aParam => {
								if (typeof record[aParam] == "string" && record[aParam].indexOf(aSearchItem)>=0) foundInRecord = true;
							})
							if (!foundInRecord) hasSearchItems = false;
						})
					}
					if (doShow && hasSearchItems) {
						shownList.recordsShown.push(JSON.parse(JSON.stringify(record)));
						if (shownList.othersChanges.saveOthersRec[record._id]) {
							Object.keys(shownList.othersChanges.saveOthersRec[record._id].changes).forEach(aParam => {
								if (aParam=="listoryDate") {
									shownList.recordsShown[shownList.recordsShown.length-1].listoryDate = Math.max(shownList.recordsShown[shownList.recordsShown.length-1].listoryDate, shownList.othersChanges.saveOthersRec[record._id].changes.listoryDate)
								} else {
									shownList.recordsShown[shownList.recordsShown.length-1].aParam = shownList.othersChanges.saveOthersRec[record._id].changes[aParam];
								}
							})								
						}
					}
				}
			}
		});
	}

	// update shownList.recordsShown for changes to these records in feed
		let counter = 0;
	if (!listory.isEmpty("feed")){
		listory.data.feed.forEach(function (feedObj) {
			//onsole.log(feedObj)
			if (!feedObj.accepted && !feedObj.rejected && feedObj.listoryId == shownList.listoryId && feedObj.listoryIdType == shownList.listoryIdType && (!shownList.othersChanges.saveOthersFeed[feedObj._id] || !feedisAccOrRej(shownList.othersChanges.saveOthersFeed[feedObj._id].changes) ) ) {
					updateRecordsShownListWithFeed(feedObj);
				}
		})
	}

	Object.keys(shownList.headers).forEach(aParam => {
		doSumsForShownField(aParam)})
}
var doSumsForShownField = function(aParam, options={}){
	//onsole.log("doSumsForShownField "+aParam)
	if (shownList.sums[aParam]) shownList.sums[aParam]=null;
	shownList.recordsShown.forEach(shownRecord =>  {
	// add to sums and count
		if (!isASystemField(aParam) && isANumber(shownRecord[aParam])){
			if (!shownList.sums[aParam]) shownList.sums[aParam]={'sum':0,'countNum':0}
			shownList.sums[aParam].sum += parseFloat(shownRecord[aParam]);
			shownList.sums[aParam].countNum++;

			shownRecord._numFields = addToListAsUnique(shownRecord._numFields, aParam);
		}
	})
	if (options.doShow && dg.el('lsSumToggle')) {
		populateSumCell(aParam) 
	}
}
var isASystemField = function(aParam) {
	if (aParam.indexOf('_')>-1) return true;
	if (aParam.indexOf('listory')>-1) return true;
	return false;
}
var viewGridIsListView = function(){
	return (listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType].type =="listing")
}
var viewGridTableIsFixed = function(){
	return (listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType] && listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType].type =="fixed grid")
}
var nonEmptyFiltersExist = function() {
	tempret = false;
	let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
	if (theView.filters && theView.filters.length>0) {
		theView.filters.forEach(aFilter => {if (aFilter.symbol && aFilter.symbol!="") tempret= true});
	}
	return tempret
}
var SortTable = function(e) {
	let sortDir = (e.target.className.indexOf("chevron-up")>0 || e.target.className.indexOf("chevron-right")>0 )? "desc":"asc";
	sortShownList({sortBy:e.target.id.split("_")[1], sortDir});
	showAllRecords();
}
var sortShownList = function(options = {}) {
	// sorts shownList recordsShown
	// todo re-sort by modified date - records and feeds

	let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
	theView.sortBy = options.sortBy || theView.sortBy || "date";
	theView.sortDir = options.sortDir || theView.sortDir || (viewGridIsListView()? "desc":"asc");

	if (theView.sortDir && dg.el("headerSorter_"+theView.sortBy)) dg.el("headerSorter_"+theView.sortBy).className = "headsorter fa fa-chevron-right"
	let isAsc = (theView.sortDir == "asc")
	function theSorter(obj1,obj2) {
		if (!obj1) return isAsc? -1:1;
		if (!obj2) return isAsc? 1:-1;
		let obj1Value = obj1[theView.sortBy];
		let obj2Value = obj2[theView.sortBy];

		if (theView.sortBy == "date" || theView.sortBy == "listoryDate" || (obj1Value==null && obj2Value==null ) ) {
			obj1Value = dateFromFeed(obj1);
			obj2Value = dateFromFeed(obj2);
		} else if (!isNaN(obj1Value) && !isNaN(obj2Value) ) {
			obj1Value = parseFloat(obj1Value);
			obj2Value = parseFloat(obj2Value);
		}
		if (obj1Value == null) return isAsc? -1:1;
		if (obj2Value == null) return isAsc? 1:-1;
		return ((obj1Value>obj2Value? 1:-1)*(isAsc? 1:-1))
	}
	shownList.recordsShown.sort(theSorter)
	//onsole.log(shownList.recordsShown)

	setTimeout(function() {if (dg.el("headerSorter_"+theView.sortBy)) dg.el("headerSorter_"+theView.sortBy).className ="headsorter fa fa-chevron-"+ (isAsc?"up":"down"),10})
}
var setFixedBodyHeight = function() {
	setTimeout(function() {
		let headerRect = dg.el("listDetailsHead").getBoundingClientRect();
		let maxHeight = window.innerHeight - headerRect.bottom - 10;
		dg.el('listDetailsBody').style['max-height'] = maxHeight+"px"
	},10)
}

var showAllRecords = function(options = {'showHeaderFilters':null}) {
	if (viewGridIsListView()) {showRecordsAsListView(options) } else {showRecordsAsTableView(options)}
}
var fieldNameFromFieldNameOrDisplayName = function(aName) {
	let fieldDef = firstObjInList(shownList.listMeta.fields, {'name':aName});
	if (!fieldDef) fieldDef = firstObjInList(shownList.listMeta.fields, {'displayName':aName});
	return (fieldDef && fieldDef.name)? fieldDef.name : null;
}

var displayNameFromFieldName = function(fieldName) {
	let fieldDef = firstObjInList(shownList.listMeta.fields, {'name':fieldName});
	return (fieldDef && fieldDef.displayName)? fieldDef.displayName : fieldName;
}
var fieldTypeFromFieldName = function(fieldName) {
	let fieldDef = firstObjInList(shownList.listMeta.fields, {'name':fieldName});
	return (fieldDef && fieldDef.type)? fieldDef.type : null;
}
var showRecordsAsListView = function (options){
	// uses shownList to show all records in a list view (like a feed)
	//onsole.log("showRecordsAsListView")
	let listDetails = dg.el('listDetails',{'clear':true})

	listDetails.style['text-align']="center";
	let listDetailsBody = dg.div({className:'oneListInner'})

	if (!options.fulldata && !isEmpty(shownList.sums)){
		let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
		let fieldsToShow = theView.showFields?  listfromCSV(theView.showFields) : shownList.listMeta.fields;
		listDetailsBody.appendChild(dg.div(
				dg.span({className:'smallFieldNameHeader'}, "Summary: Showing "),
				dg.span({},shownList.recordsShown.length+""),
				dg.span({className:'smallFieldNameHeader'}, " records. "),
		))
		fieldsToShow.forEach( function(aParam) {
			if (shownList.sums[aParam]) {listDetailsBody.appendChild(
					dg.div(
						dg.span({className:'smallFieldNameHeader'}, " - "+displayNameFromFieldName(aParam)+": "),
						dg.span( {'id': 'lsSum_'+aParam+"_count"},""),
						dg.span( {className:'smallFieldNameHeader'} ," records toalling: "),
						dg.span( {'id': 'lsSum_'+aParam+"_sum"},""),
						dg.span( {className:'smallFieldNameHeader'} ,". Average: "),
						dg.span( {'id': 'lsSum_'+aParam+"_avg"},""),
						dg.span( {className:'smallFieldNameHeader'} ,"."),
				))
			setTimeout(function(){ populateSumCell(aParam),1}) ;
			}
		})
	}
	//listDetailsBody.appendChild(dg.br())
	if (!options.fulldata) listDetailsBody.appendChild(EMPTY_RECORD_DIV())

	listDetails.appendChild(listDetailsBody)

	shownList.recordsShown.forEach(function(record){
			listDetailsBody.appendChild(generateListViewOfRecord(record, {'editable':false}))
	})

	setTimeout(function(){
		shownList.recordsShown.forEach(function (record) {
			recolorUnSavedPartsOfRecord(record, options);
		})
	},1)
}
const EMPTY_RECORD_DIV = function() {
	return dg.div({style:{
				'border-bottom':"1px solid lightseagreen",
				'margin-top':'10px'
			}})
}
var generateListViewOfRecord = function(record, options = {'editable':false, 'fulldata':false}) {
	//onsole.log(record)
	let recordDiv = EMPTY_RECORD_DIV();
	recordDiv.appendChild(dg.div({className:'smallgrey'},'Record '+((record._owner && freezr_user_id!=record._owner)? ('created by '+record._owner+', '):'' )+'last modified on '+dateTimeStringFromFeed(record)))
	shownList.showTheseKeys.forEach(fieldName => {
		let fieldDef = firstObjInList(shownList.listMeta.fields, {'name':fieldName});
		recordDiv.appendChild(generateFieldDivForListView(record, fieldDef, options))
	})
	let hasHiddenFields = false;
	if (options.fulldata) {
		let hiddenFields = dg.div({style:{'display':'none'},'id':'detailViewDisplay'})
		shownList.listMeta.fields.forEach(fieldDef => {
			if (shownList.showTheseKeys.indexOf(fieldDef.name)<0){
				hiddenFields.appendChild(generateFieldDivForListView(record, fieldDef, options))
				hasHiddenFields = true;
			}
		});
		recordDiv.appendChild(hiddenFields);
	}

	recordDiv.appendChild(dg.makeElement("center", dg.button(
		{className:'smallButt smallFaButtText',
		'style':{'margin':'5px'},
		'id':'lsDetailsRec_'+(record._id || record.fj_local_temp_unique_id)+"_"+(record._id?"dbid":"localtemp")+"_showDetails",
		'onclick': options.fulldata? 
			function(e){
				this.parentNode.appendChild(dg.div({'style':{'min-height':'10px'}}))
				this.style.display="none"; 
				if (dg.el('detailViewDisplay')) dg.el('detailViewDisplay').style.display="block"
			} : 
			function(e) {showFullRecordDetails((record._id || record.fj_local_temp_unique_id), (record._id?"dbid":"localtemp"), false)}
		}, 
		options.fulldata? "Show All Fields": "Record Details")
	))

	return recordDiv
}
var recolorUnSavedPartsOfRecord = function(record, options={}) {
	//onsole.log("recolorUnSavedPartsOfRecord "+options.fulldata)
	if (record._savedParams){
		Object.keys(record._savedParams).forEach(function(aParam) {
			let theEl = dg.el((options.fulldata?"lsRec_":"lsNonEdRec_")+(record._id || record.fj_local_temp_unique_id)+"_"+(record._id?"dbid":"localtemp")+"_"+aParam)
			if (theEl) {
				theEl.style.color = CHGED_FIELD_COLOR;
			} // else ok not to find unshown el
		})
		//onsole.log("recoloring "+record._id+" canEdit?"+currentUserCanEditRecordinList(record))
		if (currentUserCanEditRecordinList(record) && dg.el("lsRec_"+(record._id || record.fj_local_temp_unique_id)+"_"+(record._id?"dbid":"localtemp")+"_listorySave")) dg.el("lsRec_"+(record._id || record.fj_local_temp_unique_id)+"_"+(record._id?"dbid":"localtemp")+"_listorySave").style.color = CHGED_FIELD_COLOR;
	}
}
var generateFieldDivForListView	= function(record, fieldDef = {}, options={}) {	
	
	let fieldName = fieldDef? fieldDef.name: null;
	let returnDiv = dg.div();

	let previousData = "";
	let divNamePartZero = options.fulldata?"lsDetailsRec_":"lsNonEdRec_"; // OLd lsRec_

	let canEdit = currentUserCanEditRecordinList(record);

	let hasUnsavedValue = options.fulldata && record._savedParams && fieldName && record._savedParams[fieldName];
	if (hasUnsavedValue) {
		previousData = " (previously saved value: "+(fieldDef.type == 'boolean'? (record[fieldName]? "true":"false") : record._savedParams[fieldName])+ ")"
	}

	if (fieldName && (record[fieldName] || options.fulldata)){
		returnDiv.appendChild(dg.div({
			className: 'smallFieldNameHeader'
		},dg.span(((fieldDef && fieldDef.displayName)? fieldDef.displayName : fieldName)),dg.span({ className:'smallgrey'},previousData)
		));

		if (fieldDef.type == 'boolean') {
			let theEl = dg.makeElement('input',
				 {	'type':'checkbox',
				 	'className':'mainTableBool',
				 	'style': {'margin-left':'10px'},
				 	'disabled': (!options.fulldata || !canEdit),
				 	'contentEditable':false,
					'id': divNamePartZero+ idAndTypeFromRec(record) +"_"+fieldName,
					'onchange': updateFeedWithChange
				 })
			theEl.checked = record[fieldName]? true:false
			returnDiv.appendChild(theEl) 	
		} else if (fieldDef.type == 'multichoice' && options.fulldata && canEdit) {			
			let theEl = dg.select(
				 {	'className':'listViewChooser', 
				 	'contentEditable':false,
				 	'style': {'color':hasUnsavedValue? CHGED_FIELD_COLOR: DEFAULT_COLOR},
					'id': divNamePartZero+idAndTypeFromRec(record) +"_"+fieldName,
					'onchange': updateFeedWithChange
				 }
			)
			let choices = listfromCSV(fieldDef.typedetails);
			choices.forEach(aChoice => {theEl.appendChild(dg.option(aChoice));})
			theEl.value = record[fieldName];
			returnDiv.appendChild(theEl)
		} else {
			returnDiv.appendChild(dg.div(
				{	'id':(divNamePartZero+idAndTypeFromRec(record) +"_"+fieldName),
					'className':options.fulldata?'fieldinListViewText':'',
					'contentEditable': (options.fulldata && canEdit),
					'style': {'color':hasUnsavedValue? CHGED_FIELD_COLOR: DEFAULT_COLOR},
					'onpaste': function(e) {
						setTimeout(function() {
							e.target.innerHTML = e.target.innerText;
							updateFeedWithChange(e);
						},0)
					},
					'onkeydown': function(e) {
						if (e.keyCode == 13 || e.keyCode == 9) {
							if (e.keyCode == 13) e.preventDefault();
							doSumsForShownField(currentKey, {doShow:true});
							if (e.target.style.color == UNSUMMED_NUM_COLOR) e.target.style.color = CHGED_FIELD_COLOR;
						} else {
							updateFeedWithChange(e);
						}
					}
				},
				record[fieldName]
			));
		}
	}
	return returnDiv;		
}
var currentUserCanEditRecordinList = function(record) {
	return shownList.myRights.canAdd && 
			( isOwnedObject(record)  // can always edit your own records
			 || shownList.myRights.canEdit)
}
var userAllowedToAddToShownList = function(userid){	

	let rights = firstObjInList(shownList.listMeta.sharing, {'name':userid})
	return 	(userid==freezr_user_id && !shownList.listMeta._owner) || 
			shownList.listMeta._owner==userid || 
			(rights && rights.adder)
}
var userAllowedToEditInShownList = function(userid){	
	let rights = firstObjInList(shownList.listMeta.sharing, {'name':userid})
	return (userid==freezr_user_id && shownList.listoryIdType=="localtemp") || 
			shownList.listMeta._owner==userid || 
			(rights && rights.editor)
}
var showRecordsAsTableView = function (options){
	// uses shownList to show all records in a table or feed view

	// todo DECIDE WHAT KIND OF TABLE (eg grid, or list etc) and abstactify below
	//onsole.log(shownList)
	
	dg.el('listDetails',{'clear':true}).appendChild(dg.table([], allRecordsTableViewOptions()));

	//onsole.log("showRecordsAsTableView")
	shownList.minHeaderwidths = {} // Get header widths before table is set
	if (viewGridTableIsFixed()) {
		setFixedBodyHeight();
		
		Object.keys(shownList.headers).forEach(aParam => {
			/*
			if (aParam=="listoryExpander" || aParam=="listoryDate" || aParam=="listorySave") {
				shownList.minHeaderwidths[aParam]=22
			} else 
			*/

			if (paramTypeinCurrentList(aParam)  == "boolean") {
				shownList.minHeaderwidths[aParam]=Math.max(60,dg.el("lsRec_header_"+aParam)? dg.el("lsRec_header_"+aParam).offsetWidth:0);
			} else {
				if (paramTypeinCurrentList(aParam) == "multichoice") console.log("NEED TO FIURE OUT HOW TO DO MULTIOCHOICE");
				shownList.minHeaderwidths[aParam] = dg.el("lsRec_header_"+aParam)? dg.el("lsRec_header_"+aParam).offsetWidth+10 : "NONE";
			}
		})
	}

	let mainTable = dg.el('listDetailsBody');

	shownList.recordsShown.forEach(function(record){
		mainTable.appendChild(dg.row(record, allRecordsTableViewOptions(), ++shownList.lastRowNum))
	})

	if (!isEmpty(shownList.sums)){mainTable.appendChild(dg.row( {}, tableSumOptions(), shownList.lastRowNum+1))}

	dg.el("lsRec_header_listoryExpander",{'clear':true}).className="";
	dg.el("lsRec_header_listoryExpander").appendChild(
		dg.span({className:"fa fa-chevron-circle-right",
				 style: {'margin-left':'0px', 'margin-right':'2px', 'padding':'0'},
				 onclick: toggleHeaderFilters  }))

	if (options.showHeaderFilters || nonEmptyFiltersExist()) toggleHeaderFilters({target: dg.el('lsRec_header_listoryExpander').firstChild}, {'showSame':true});


	setTimeout(function(){
		shownList.recordsShown.forEach(function (record) {
			if (record._savedParams && !isEmpty(record._savedParams)){
				if (currentUserCanEditRecordinList(record) ) dg.el("lsRec_"+(record._id || record.fj_local_temp_unique_id)+"_"+(record._id?"dbid":"localtemp")+"_listorySave").style.color = CHGED_FIELD_COLOR;
				Object.keys(record._savedParams).forEach(function(aParam) {
					let theEl = dg.el("lsRec_"+(record._id || record.fj_local_temp_unique_id)+"_"+(record._id?"dbid":"localtemp")+"_"+aParam)
					if (theEl) {
						theEl.style.color = CHGED_FIELD_COLOR;
					}
				})
			}
		})
		resetHeaderLengths();


	},1)
	dg.el("lsRec_header_listorySave").style["background-color"]="white";
}
var allRecordsTableViewOptions = function() {
	let baseOptions = {
		keys: { // shows which fields to show and and not show in the grid
			showThese: shownList.showTheseKeys
		}, 
		headers: shownList.headers,
		headerTitles: shownList.headerTitles,
		props: { // properties by tag name or field specific
			table: {
				'id':'listDetailsTable',
				'className': 'ls_grid_simple_table '+(viewGridTableIsFixed()?" fixedheadTable ":"")
			},
			thead:{
				id: 'listDetailsHead',
				className: (viewGridTableIsFixed()?"fixedheadHead ":"")
			},
			tbody: {
				id: 'listDetailsBody',
				className: (viewGridTableIsFixed()?" fixedheadBody ":"")
			},
			th: {'className':'ls_grid_simple_th'+(viewGridTableIsFixed()?" fixedHeaderTH":"")},
			tr: {},
			td: {},
    		id: function(key, record, rowCounter) {
    			//onsole.log("in making id rec is")
    			//onsole.log(record)
    			return "lsRec_"+ idAndTypeFromRec(record) +"_"+key
    		},
			keyspecific:{
				'listoryExpander': {
				/*	'contentEditable':false,
					'style': {'cursor':'pointer', color:'lightseagreen','width':shownList.widths['listoryExpander'],'min-width':shownList.widths['listoryExpander']},
					onclick: function (e) {toggleRecordNotes(e.target)},
					'className':'fa fa-chevron-circle-right'
					*/
				}, 
			},
		},
		transform: {
		}
	}

	baseOptions.transform['listoryExpander'] = function(tag, props, record, rowCounter) {
			newprops = JSON.parse(JSON.stringify(props))
			newprops.contentEditable = false;
			newprops.id = "row_"+rowCounter;
			newprops.style = { 'text-align':'center',color:'lightseagreen',} // 'width':shownList.widths['listorySave'],'min-width':shownList.widths['listorySave'],
			if (!newprops.style) newprops.style = {};
			newprops.style['text-align']='center'
			let theEl = dg.makeElement(tag, newprops, dg.button(
				 {	'id': "lsRec_"+ idAndTypeFromRec(record) +"_"+'listoryExpander',
					'className':'fa fa-chevron-circle-right',
					'style': {'border':'none', 'cursor':'pointer', color:'lightseagreen','margin-left':'-2px','padding':'0', 'margin-top': '5px', 'background-color':'white'},
					 onclick: function (e) {toggleRecordNotes(e.target)},
					 onkeydown: function(e) {
					 	if (e.keyCode == 9) {
							e.preventDefault(); 
							let nextTab=dg.el("lsRec_"+ idAndTypeFromRec(record) +"_"+'listoryNote');
							if (nextTab && dg.el("lsNotes_"+ idAndTypeFromRec(record)).style.display != "none") {
								nextTab.focus()
							} else {
								let holderId=e.target.parentNode.id
								nextTab = dg.el("row_"+(parseInt(holderId.split("_")[1])+1) )
								if (!nextTab) nextTab = dg.el("row_0");
								if (nextTab) {
									if (shownList.showTheseKeys[1]=="listoryDate") nextTab = nextTab.nextSibling;
									nextTab.nextSibling.focus();
								} else {/*where to go?*/}

							}
					 }},
				 }
			))
			return theEl
		}


	baseOptions.transform['listorySave'] = function(tag, props, record, rowCounter) {
			let canEdit = currentUserCanEditRecordinList(record)
			newprops = JSON.parse(JSON.stringify(props))
			newprops.contentEditable = false;
			newprops.id = null;
			newprops.style = {'margin-left': '4px','width':shownList.widths['listorySave'],'min-width':shownList.widths['listorySave'], 'text-align':'center'}
			if (!newprops.style) newprops.style = {};
			newprops.style['text-align']='center'
			let saveRow = function(e) {
			 	if (e.target.style.color != 'lightgrey' && canEdit) {
						splits = e.target.id.split("_")
						saveRecordChanges(splits[1], splits[2], false)
			 	}
			 }
			let theEl = dg.makeElement(tag, newprops, dg.button(
				 {	'id': "lsRec_"+ idAndTypeFromRec(record) +"_"+'listorySave',
					 onclick:( canEdit? saveRow: null),
					 onkeydown: function(e) {
						if (e.keyCode == 9) {
							e.preventDefault(); nextTab=dg.el("lsRec_"+ idAndTypeFromRec(record) +"_"+'listoryExpander');
							if (nextTab) nextTab.focus()
					 }},



					'className':'fa fa-save',
					style: {'border':'none', 'cursor':'pointer', color:'lightgrey','background-color':'white'}
				 }
			))
			return theEl
		}	
	baseOptions.transform['listoryDate'] = function(tag, props, record, rowCounter) {
			newprops = JSON.parse(JSON.stringify(props))
			newprops.contentEditable = false;
			newprops.id = "lsRec_"+ idAndTypeFromRec(record) +"_listoryDate";
			newprops.style = {'margin-left': '4px','width':shownList.widths['listorySave'],'min-width':shownList.widths['listoryDate'], 'line-height':'105%' , 'text-align':'center', 'font-size':'7px','color':'grey',  'vertical-align': 'top', 'padding-top': '6px'}
			if (!newprops.style) newprops.style = {};
			newprops.style['text-align']='center'
			theDate = new Date (record.listoryDate || Math.max((record.fj_modified_locally || null), (record._date_Modified || null )) )
			let theEl = dg.makeElement(tag, newprops, (theDate.toLocaleDateString()+" "+theDate.toLocaleTimeString()))
			return theEl
		}
	shownList.listMeta.fields.forEach(fieldDef => {
		if (fieldDef.type == 'multichoice') {
			let key = fieldDef.name;
			baseOptions.transform[key] = function(tag, props, record, rowCounter) {
				let canEdit = currentUserCanEditRecordinList(record)
				newprops = JSON.parse(JSON.stringify(props))
				newprops.id = null;
				newprops.className="ls_grid_simple_td"
				if (!newprops.style) newprops.style = {};
				newprops.style['text-align']='center'
				newprops.style['min-width']= (shownList.minHeaderwidths[key] || 0)+"px"
				newprops.style['width']= (shownList.minHeaderwidths[key] || 0)+"px"
				let theEl = dg.makeElement(tag, newprops, dg.select(
					 {	'className':'mainTableChooser', 
						 'vertical-align':'top',
					 	'contentEditable':false,
						'disabled' : !canEdit,
						'id': "lsRec_"+ idAndTypeFromRec(record) +"_"+key,
						'onchange': updateFeedWithChange
					 }
				))
				let choices = listfromCSV(fieldDef.typedetails);
				choices.forEach(aChoice => {theEl.firstChild.appendChild(dg.option(aChoice));})
				theEl.firstChild.value = record[key];
				return theEl
			}
		} else if (fieldDef.type == 'boolean') {
			let key = fieldDef.name;
			baseOptions.transform[key] = function(tag, props, record, rowCounter) {
				newprops = JSON.parse(JSON.stringify(props))
				newprops.contentEditable = false;
				newprops.className="ls_grid_simple_td"
				newprops.id = null;
				let canEdit = currentUserCanEditRecordinList(record)
				if (!newprops.style) newprops.style = {};
				newprops.style['text-align']='center'
				newprops.style['vertical-align']='top'
				newprops.style['min-width']= (shownList.minHeaderwidths[key] || 0)+"px"
				newprops.style['width']= (shownList.minHeaderwidths[key] || 0)+"px"
				let theEl = dg.makeElement(tag, newprops, dg.makeElement('input',
					 {	'type':'checkbox',
					 	'className':'mainTableBool', 
					 	'disabled' :!canEdit,
						'id': "lsRec_"+ idAndTypeFromRec(record) +"_"+key,
						'onchange': updateFeedWithChange
					 }
				),dg.makeElement('label'))
				theEl.firstChild.checked = record[key]? true:false
				return theEl
			}
		} else {
			let key = fieldDef.name;
			baseOptions.transform[key] = function(tag, props, record, rowCounter) {
				let canEdit = currentUserCanEditRecordinList(record)
				let newprops = {
					'className':'ls_grid_simple_td'+(viewGridTableIsFixed()?" fixedHeaderEl":""),
					'contentEditable':canEdit,
					id: "lsRec_"+ idAndTypeFromRec(record) +"_"+key,
					style : {
						'text-align':'left',
						'margin-left':'3px',
						 'white-space': 'pre-line',
						 'vertical-align':'top',
						//'width':(shownList.minHeaderwidths[key] || 0)+"px",
						'min-width':(shownList.minHeaderwidths[key] || 0)+"px",
						'max-height':'20px',
						'height':'20px',
					},
					'onpaste': function(e) {
						setTimeout(function() {
							e.target.innerHTML = e.target.innerText;
							updateFeedWithChange(e);
						},0)
					},
					'onkeydown': function(e) {
						if (e.keyCode == 27) { // escape
							e.preventDefault();
						} else if (e.keyCode == 9) {
							e.preventDefault();
							let keySplit = e.target.id.split("_")
							let currentKey = keySplit[3];
							doSumsForShownField(currentKey, {doShow:true});
							if (e.target.style.color == UNSUMMED_NUM_COLOR) e.target.style.color = CHGED_FIELD_COLOR;
							tabSequence = shownList.showTheseKeys
							let nextTab = null;
							if (tabSequence.indexOf(currentKey)<tabSequence.length-1){
								keySplit[3] =  tabSequence [tabSequence.indexOf(currentKey)+1];
								nextTab = dg.el(keySplit.join("_"))
							} else {
								nextTab = null;
								try {nextTab = e.target.parentNode.nextSibling.firstChild.nextSibling
								} catch(e) { nextTab = dg.el("butt_mainTable_AddRow")} 
							}
							if (nextTab) nextTab.focus();
						} else {
							updateFeedWithChange(e);
						}
					}			
				}			
				return dg.makeElement(tag, newprops, (record[key] || ""))
			}
		}
	})
	return baseOptions;
}
var tableSumOptions = function() {
	let sumRowOptions = {
		keys: { // shows which fields to show and and not show in the grid
			showThese: shownList.showTheseKeys
		}, 
		headers: shownList.headers,
		headerTitles: shownList.headerTitles,
		props: { // properties by tag name or field specific
			table: {
				'id':'listDetailsTable',
				'className': 'ls_grid_simple_table'
			},
			th: {'className':'ls_grid_simple_th'},
			tr:null,
			td: {
				'className':'ls_grid_simple_th',
				'contentEditable':false
			},
			keyspecific:{
			}
		},
		transform: {
		}
	}
	sumRowOptions.transform['listoryExpander'] = function(tag, props, record, rowCounter) {
		return dg.makeElement(tag, {
			style:{'background-color':'lightseagreen', 'color':'white', 'padding-left': '4px','cursor':'pointer'},
			id:'lsSumToggle',
			onclick: function(e) {toggleSumAverage(e)}
		},"∑")
	}
	sumRowOptions.transform['listorySave'] = function(tag, props, record, rowCounter) {
		return dg.makeElement(tag)
	}
	shownList.listMeta.fields.forEach(fieldDef => {
		let key = fieldDef.name;
		if (fieldDef.type == 'multichoice' || fieldDef.type == 'boolean') {
			let key = fieldDef.name;
			sumRowOptions.transform[key] = function(tag, props, record, rowCounter) {
				return dg.makeElement(tag,props,'');
			}
		} else {
			sumRowOptions.transform[key] = function(tag, props, record, rowCounter) {
					return  dg.makeElement(tag, {
						id:'lsSum_'+key, 
						className:("ls_grid_sumEl"+(viewGridTableIsFixed()?" fixedHeaderEl":""))},
						" "+(shownList.sums[key]? shownList.sums[key].sum : "") )
			}
		}
	})
	let toggleSumAverage = function(e){
		let type = "sum"
		if(e.target.innerText=="∑"){
			type = "average"
			e.target.innerText='μ'
		} else {
			e.target.innerText="∑"
		}
		Object.keys(shownList.sums).forEach(function(aParam) {
			populateSumCell(aParam,type)
		} ) 
	}
	return sumRowOptions;
}

var resetHeaderLengths = function(){
	// get length of first row to reset table headers
	if (viewGridTableIsFixed()) {
		setTimeout(function(){
			let sampleRec = shownList.recordsShown[0]
			if (sampleRec){
				let recElId = sampleRec._id? (sampleRec._id +"_dbid_") : (sampleRec.fj_local_temp_unique_id+"_localtemp_")
				shownList.showTheseKeys.forEach(aParam => {
					sampleEl = document.getElementById("lsRec_"+recElId+aParam);
					if (fieldTypeFromFieldName(aParam)=="boolean") sampleEl=sampleEl.parentNode;
					let sampleRight = parseFloat(sampleEl.getBoundingClientRect().right)
					let headerleft = parseFloat(document.getElementById("lsRec_header_"+aParam).getBoundingClientRect().left)
					dg.el("lsRec_header_"+aParam).style['width']= (sampleRight - headerleft-10)+"px"
					
				})
			}
		},1)
	}
}

var toggleHeaderFilters = function(e, options={}) {
	let el = e.target
	let doShow = (el.className == 'fa fa-chevron-circle-right')

	let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
	let filterRow = dg.el("lsFiltersRow");

	if (!doShow) {
		el.className = 'fa fa-chevron-circle-right';
		if (filterRow) filterRow.style.display = "none"
	} else if (!viewGridTableIsFixed()){
		if (!filterRow) {
			filterRow = dg.makeElement('tr',{'id':'lsFiltersRow'}); 
			let eachTr = null
			shownList.showTheseKeys.forEach(aParam => {
				if (aParam == "listoryExpander") {
					filterRow.appendChild(dg.makeElement('td',{
						'className':'fa fa-ban', 
						'title':'Remove Filters',
						'style':{'background-color': 'lightseagreen','margin-top':'1px', 'margin-left': '-3px','cursor':'pointer', 'color': 'white','border-radius': '5px', 'padding': '3px'},
						onclick: function() {
							let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
							theView.filters = [];
							filterList();sortShownList();showAllRecords({'showHeaderFilters':false});}
					}))
				} else if (aParam == "listorySave"){
					filterRow.appendChild(dg.makeElement('td',{
						'className':'fa fa-filter', 
						'title':'Re-filter',
						'style':{'background-color': 'lightseagreen','margin-top':'1px', 'margin-left': '3px','cursor':'pointer', 'color': 'white','border-radius': '5px', 'padding': '3px'},
						onclick: function() {filterList();sortShownList();showAllRecords({'showHeaderFilters':true});}
					}))
				} else {
					//theFilter 
					var elWidth = shownList.minHeaderwidths[aParam]+1;
					eachTd = dg.makeElement('th',{id:'lsFilterHolder_'+aParam,style:{'padding':0, 'width':(elWidth+"px")}},
						dg.div(
							{'className':'ls_grid_simple_th lsFilterHolder'},
							dg.makeElement('table', {width:'100%'},
								dg.makeElement('tr', 
									dg.makeElement('td',{style:{'width':'30px'}},
									dg.createSelect((paramTypeinCurrentList(aParam) == "multichoice" || paramTypeinCurrentList(aParam) == "boolean")?[' ','=','≠']:[' ','=','∈','≠'],{
										'id':'lsRec_headFilter_symbol_'+aParam,
										style:{'background-color':'rgba(255,255,255,0.85)'},
										onchange: function(e) {
											let filterIndex = getListIdxByParam(aParam,theView.filters,'field');
											if (filterIndex<0) {
												theView.filters.push({'field':aParam,'value':'','paramType':paramTypeinCurrentList(aParam) })
												filterIndex = theView.filters.length-1;
											}
											theView.filters[filterIndex].symbol = this.value;
											filterList(); sortShownList();showAllRecords({'showHeaderFilters':true});
											
										}
									})
								), 
								dg.makeElement('td',
									(paramTypeinCurrentList(aParam) == "multichoice")?
										dg.createSelect(getChoiceListFromListMeta(aParam),{
											'id':'lsRec_headFilter_value_'+aParam,
											style:{'background-color':'rgba(255,255,255,0.85)', 'color':'white'},
											disabled:true,
											onchange: function(e) {
												let filterIndex = getListIdxByParam(aParam,theView.filters,'field');
												theView.filters[filterIndex].value = e.target.value;
												filterList(); sortShownList();showAllRecords({'showHeaderFilters':true});
											}
										}) 
										: ((paramTypeinCurrentList(aParam) == "boolean")?
										dg.makeElement('input',
											 {	'type':'checkbox',
											 	'className':'mainTableBool', 
											 	'contentEditable':false,
												'id': 'lsRec_headFilter_value_'+aParam,
												'onchange': function(e) {
													let filterIndex = getListIdxByParam(aParam,theView.filters,'field');
													theView.filters[filterIndex].value = e.target.checked;
													filterList();
													sortShownList();showAllRecords({'showHeaderFilters':true});
												}
											 }
										)
										:
										dg.div({
											className:'inputPlaceholder',
											style:{
												'display':'inline-block', 
												'min-width':'40px',
												'background-color':'rgba(255,255,255,0.85)','color':'white', 'font-size':'10px','border-radius':'2px','padding-left':'2px','padding-right':'2px', 'max-height': '16px', 'overflow-x': 'scroll', 'vertical-align': 'bottom'},
											//contentEditable:true,
											id:'lsRec_headFilter_value_'+aParam,
											'data-placeholder':"Filter",
											'onpaste': function(e) {
												setTimeout(function() {
													let filterIndex = getListIdxByParam(aParam,theView.filters,'field')
													if (filterIndex <0) {showWarning("Internal error getting filter")} else {
															theView.filters[filterIndex].value = e.target.innerText;
													}
												},0)
											},
											'onkeydown': function(e) {
												if (e.keyCode == 13 || e.keyCode == 9) {
													if (e.keyCode == 13) e.preventDefault;
													filterList();
													sortShownList();showAllRecords({'showHeaderFilters':true});
												} else {
													setTimeout(function() {
														let filterIndex = getListIdxByParam(aParam,theView.filters,'field');
														theView.filters[filterIndex].value = e.target.innerText;
													},0);
												}
											}
										})
									)
								)
							))
						)
					),
					//"filter for "+aParam)
					filterRow.appendChild(eachTd);
				}
			})
		}
		filterRow.style.display = null;
		el.className = 'fa fa-chevron-circle-down';
		setTimeout(function(){
			//shownList.showTheseKeys.forEach(aParam => {if (dg.el('lsRec_headFilter_symbol_'+aParam)) dg.el('lsRec_headFilter_symbol_'+aParam).value=null})
			let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
			theView.filters.forEach(aFilter => {
				if (aFilter.symbol && aFilter.symbol!=" "){
					if (dg.el('lsRec_headFilter_symbol_'+aFilter.field)) dg.el('lsRec_headFilter_symbol_'+aFilter.field).value=aFilter.symbol;
					if (dg.el('lsRec_headFilter_value_'+aFilter.field)) {
						if (aFilter.paramType =="multichoice"){
							dg.el('lsRec_headFilter_value_'+aFilter.field).disabled = false;
							dg.el('lsRec_headFilter_value_'+aFilter.field).value=aFilter.value || "";
						} else if (aFilter.paramType =="boolean"){
							dg.el('lsRec_headFilter_value_'+aFilter.field).disabled = false;
							dg.el('lsRec_headFilter_value_'+aFilter.field).checked = aFilter.value;
						} else {
							dg.el('lsRec_headFilter_value_'+aFilter.field).innerText=aFilter.value || "";
							dg.el('lsRec_headFilter_value_'+aFilter.field).contentEditable = true;
						}	 
						//dg.el('lsRec_headFilter_value_'+aFilter.field).style.display="inline-block";
						dg.el('lsRec_headFilter_value_'+aFilter.field).style.color="black";
						
					}
				}
			})
		},0)

		el.parentNode.parentNode.parentNode.insertBefore(filterRow, el.parentNode.parentNode.nextSibling);	

		let aTd = dg.el("lsFiltersRow").firstChild;
		while (aTd) {
			if (aTd.id && aTd.offsetWidth>dg.el("lsRec_header_"+aTd.id.split("_")[1]).offsetWidth+10) {resizeColumn(aTd.id.split("_")[1] , (aTd.offsetWidth-10.4) )}
			aTd = aTd.nextSibling
		}

 	} 	
	setFixedBodyHeight();	
}

const FILTER_SMYBOLS = ['≠','=','∈','>','<']
var findSymbolInText = function(aText) {
	let splits = aText.split(/[≠=∈><]+/);
	if (aText.length==0) {
		return {'error':'no text'}
	} else if (splits.length>2) {
		return {'error':'multiple symbols'}
	} else if (splits.length==1) {
		return {'nosplits':true, 'textPre':aText, segments:1}
	} else if (aText.length==1) {
		return {'symbol':aText, 'position':0,'symbolOnly':true, segments:1}
	} else if (splits.length==2) {
		let tempret = {'textPre':splits[0], 'textPost':splits[1], segments:((splits[0] && splits[1])?3:2)}
		FILTER_SMYBOLS.forEach(aSymbol => {if (aText.indexOf(aSymbol)>-1) {
			tempret.position = aText.indexOf(aSymbol); 
			tempret.symbol=aText.slice(tempret.position,tempret.position+1)}} )
		return tempret;
	} else {
		return {error:'unknown error for text '+aText}
	}
}
var searchTextFromViewFilter = function() {
	let searchText=""
	let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
	if (theView.searchItems) theView.searchItems.forEach(anItem => searchText += (anItem.indexOf(" ")>-1? ('"'+anItem+'"'):anItem) + " ") ;
	//  && theView.searchItems.length>0) searchText =  '"'+theView.searchItems.join('"  "')+'" '
	theView.filters.forEach(aFilter => {
		if (aFilter.symbol && aFilter.symbol!=" " && aFilter.field){
			searchText += '"'+ displayNameFromFieldName(aFilter.field)+'"'+aFilter.symbol;
			let hasSpace = (typeof aFilter.value == "string" && aFilter.value.indexOf(" ")>-1)
			searchText += (aFilter.paramType =="boolean")? aFilter.value :( (hasSpace || !aFilter.value)? ('"'+aFilter.value+'"'):aFilter.value) +" ";
		} 
	})
	return searchText;
}
var searchFromSearchString = function(myString) {
	// algo from stackoverflow.com/questions/2817646/javascript-split-string-on-space-or-on-quotes-to-array
	let myRegexp = /[^\s"]+|"([^"]*)"/gi;
	let parsedFilters = [];
	let searchItems = [];
	var initEmptyPossibleFilter = function () {return {/*'field':null, 'symbol':null, 'value':null*/}}
	// var isBlankObject = function(anObj) {return (!anObj.field && !anObj.symbol && !anObj.value)}
	let tempPossibleFilter = initEmptyPossibleFilter();
	do {
	    var match = myRegexp.exec(myString);
	    if (match != null) {
	        //Index 1 in the array is the captured group if it exists and Index 0 is the matched text, which we use if no captured group exists
	        let symbolInText = findSymbolInText(match[0])
	        if (isEmpty(tempPossibleFilter)) {
	        	if (match[1] || symbolInText.nosplits) { // segment is in a quote, or has no symbols
	        		tempPossibleFilter.field = match[1]? match[1]: match[0]; 
	        	} else if (symbolInText.segments>1 && symbolInText.position!=0){ // make sure doesnt start with symbol. ie if it has a symbol in the middle or in the end, record it
	        		if (symbolInText.textPost){
		        		parsedFilters.push ({field:symbolInText.textPre, symbol:symbolInText.symbol, value:symbolInText.textPost})
		        		tempPossibleFilter = initEmptyPossibleFilter();
	        		} else { // symbol is at end
	        			tempPossibleFilter.field = symbolInText.textPre
	        			tempPossibleFilter.symbol = symbolInText.symbol
	        		}
	        	} else {
	        		showWarning("Error (1) parsing "+match[0],3000)
	        	}
	        } else if (tempPossibleFilter.field && !tempPossibleFilter.symbol) {
	        	// see if it is a symbol or starts with a symbol and populate
	        	// if not add previous item to search terms and put this new one as a field
	        	if (match[1] || symbolInText.nosplits) { // segment is in a quote, or has no symbols, so previous item was just a search field
	        		searchItems.push (tempPossibleFilter.field)
	        		tempPossibleFilter.field = match[1]? match[1]: match[0]; 
	        	} else if (symbolInText.symbolOnly) { // add symbol and continue
	        		tempPossibleFilter.symbol=symbolInText.symbol;	
	        	} else if (symbolInText.symbol && symbolInText.textPost) {
	        		if (symbolInText.position>0) { // previous items was a search term and current has 3 segments
	        			searchItems.push (tempPossibleFilter.field)
		        		tempPossibleFilter.field = symbolInText.textPre;
	        		}
	        		parsedFilters.push ({field:tempPossibleFilter.field, symbol:symbolInText.symbol, value:symbolInText.textPost})
	        		tempPossibleFilter = initEmptyPossibleFilter();
	        	} else {
	        		showWarning("Error  misplaced symbol (2) parsing "+JSON.stringify (tempPossibleFilter) + " " +match[0],3000);
	        		tempPossibleFilter = initEmptyPossibleFilter();
	        	}
	        } else if (tempPossibleFilter.field && tempPossibleFilter.symbol) {
	        	// add as possible value
	        	if (match[1] || symbolInText.nosplits) { // segment is in a quote, or has no symbols
	        		parsedFilters.push ({field:tempPossibleFilter.field, symbol:tempPossibleFilter.symbol, value:match[1]? match[1]: match[0]})
	        	} else {
	        		showWarning("Error  misplaced symbol (3) parsing "+JSON.stringify (tempPossibleFilter) + " " +match[0],3000);
	        	}
        		tempPossibleFilter = initEmptyPossibleFilter();
	        }
	    }
	} while (match != null);
	if (tempPossibleFilter.field && tempPossibleFilter.symbol) {
		showWarning("error (4) parsing ",tempPossibleFilter)
	} else if (tempPossibleFilter.field) {
		searchItems.push(tempPossibleFilter.field)
	}
	if (parsedFilters && parsedFilters.length>0) { for (let i=parsedFilters.length; i>0; i--) {
		let  fieldName = fieldNameFromFieldNameOrDisplayName(parsedFilters[i-1].field)
		if (! fieldName) {
			showWarning("could not parse search item "+JSON.stringify(parsedFilters[i-1]),3000)
			parsedFilters.splice(i-1,1)
		} else {
			parsedFilters[i-1].field = fieldName
		}
	}}

	let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
	theView.filters = parsedFilters;
	theView.searchItems = searchItems;

	dg.el('lsSearchBox',{'clear':true}).innerText= searchTextFromViewFilter();

	function placeCaretAtEnd(el) { // stackoverflow.com/questions/4233265/contenteditable-set-caret-at-the-end-of-the-text-cross-browser
	    el.focus();
	    if (typeof window.getSelection != "undefined"
	            && typeof document.createRange != "undefined") {
	        var range = document.createRange();
	        range.selectNodeContents(el);
	        range.collapse(false);
	        var sel = window.getSelection();
	        sel.removeAllRanges();
	        sel.addRange(range);
	    } else if (typeof document.body.createTextRange != "undefined") {
	        var textRange = document.body.createTextRange();
	        textRange.moveToElementText(el);
	        textRange.collapse(false);
	        textRange.select();
	    }
	}

	placeCaretAtEnd(dg.el('lsSearchBox'))

	filterList()
	sortShownList();
	showAllRecords();
	listory.save()

}
var resizeColumn = function(name, width){
	dg.el("lsRec_header_"+name).style['width'] = width+"px";
	shownList.recordsShown.forEach(record => { 
		let el = dg.el("lsRec_"+(record._id || record.fj_local_temp_unique_id)+"_"+(record._id?"dbid_":"localtemp_")+name)
		if (el) el.style.width=width+7.2+"px";
	})
}

var toggleRecordNotes = function(el) {
	let doShow = (el.className == 'fa fa-chevron-circle-right')
	el.className = 'fa fa-chevron-circle-' + (doShow? 'down':'right');
	//onsole.log("toggleRecordNotes "+el.id)
	let recId = el.id.split('_')[1]
	let recIdType = el.id.split('_')[2]
	notesId = "lsNotes_"+recId+"_"+recIdType

	if (!doShow) {
		dg.el(notesId).style.display = "none"
	} else {
		let notesId = "lsNotes_"+recId+"_"+recIdType
		let notesEl = dg.el(notesId);
		if (!notesEl) {
			let newTr = dg.makeElement('tr', 
				dg.makeElement('td'),
				dg.makeElement('td', 
								{'id':'lsNotes_'+recId+"_"+recIdType,
								 // 'colspan': (shownList.showTheseKeys.length-1)+'' 
								},
								drawRecentRecordHistoryFromIds(recId, recIdType, {'fulldata':false /*if false, then summary shown */})
								))
			el.parentNode.parentNode.parentNode.insertBefore(newTr, el.parentNode.parentNode.nextSibling);
			dg.el(notesId).setAttribute('colspan',(shownList.showTheseKeys.length-2)+'');
		}
		dg.el(notesId).style.display=null;
		dg.el("lsDetailsRec_"+recId+"_"+recIdType+"_listoryNote").focus();
		// populate notes el
		// show notes el transition
	}
	resetHeaderLengths();
}
var feedisAccOrRej = function(aFeed) {
	return (aFeed && (aFeed.accepted || aFeed.rejected))
}
var acceptanceSorter = function(feed1,feed2) {
	if (feedisAccOrRej(feed1) && !feedisAccOrRej(feed2) ) return  1;
	if (feedisAccOrRej(feed2) && !feedisAccOrRej(feed1) ) return -1;
	return dateSorter(feed1,feed2);
}

var dateSorter = function(feed1,feed2) {
	if (dateFromFeed(feed1) > dateFromFeed(feed2) ) return -1;
		return 1;
}
var drawRecentRecordHistoryFromIds = function(recId, recIdType, options){
	//onsole.log("drawRecentRecordHistoryFromIds ",recId,recIdType)
	let theRecord = firstObjInList(shownList.recordsShown, (recIdType=="localtemp"? {"fj_local_temp_unique_id":recId}: {'_id':recId}) )
	if (theRecord) {return drawRecentRecordHistory(theRecord, options)} else {
		console.warn("could not find record "+recId+" type: "+recIdType)
	}
}
var drawRecentRecordHistory = function(shownRecord, options) {
	// draws the panel under record data with history

	let recId = idFromRec(shownRecord);
	let recIdType = idTypeFromRec(shownRecord);

	let historyList = listory.queryObjs("feed",{listoryId:shownList.listoryId, listoryIdType:shownList.listoryIdType, recordId:recId}, {'makeCopy':true});
	historyList.sort(acceptanceSorter);
	const MAXITEMS = 4

	//onsole.log(historyList)
	
	let canEdit=currentUserCanEditRecordinList(shownRecord)

	let unaccepteds = 0;
	historyList.forEach (function(histItem) {
		if (shownList.othersChanges.saveOthersFeed[histItem._id] && shownList.othersChanges.saveOthersFeed[histItem._id].changes) {
			// todolater - check for conflicts
			let theChange = shownList.othersChanges.saveOthersFeed[histItem._id].changes
			histItem.accepted = theChange.accepted;
			histItem.rejected = theChange.rejected;
			histItem.listoryChangeMade = {'changedObjOwner':(theChange._owner || freezr_user_id),'changedObjId':theChange._id}; // actually a ProposedChange but simpler to put this way
		}
		if (!feedisAccOrRej(histItem)) unaccepteds++
	})
	if (!options.fulldata && historyList.length>MAXITEMS) historyList = historyList.slice(0,(unaccepteds+MAXITEMS))

	let lastEditIsLive = (unaccepteds>0 && !feedisAccOrRej(historyList[0]) && canEdit && (!historyList[0]._owner || historyList[0]._owner == freezr_user_id)) 
	let feedText =  (lastEditIsLive && historyList[0].listoryNote)? historyList[0].listoryNote: "";

	let hasOtherChanges = (unaccepteds > (lastEditIsLive?1:0))

	let savedDiv = dg.div({'style':{'font-size':'10px','color':'darkgrey','display':'none','margin-top':'10px'}},"Previously saved values: ")
	if (shownRecord._savedParams && !isEmpty(shownRecord._savedParams)) {
		savedDiv.style.display = "block";
		let firstOne=true;
		Object.keys(shownRecord._savedParams).forEach(function(aParam) {
			savedDiv.innerText += (firstOne?"":", ")+ aParam+': "'+(shownRecord._savedParams[aParam]===undefined? '':shownRecord._savedParams[aParam]) +'"'; 
			firstOne=false;})
	}



	let drawHistory = function(options) {
		let wrapper = dg.div();

		if (historyList && historyList.length>0) {
			let changes = dg.div({'style':{'font-size':'10px','color':'darkgrey'}})
			changes.appendChild(dg.div( 
				dg.div({'style':{'text-decoration':'underline', 'margin-top':(options.fulldata?'10px':null)}}, 
				"Change / Notes History:"))
			);

			let ignoreFirstInList = (lastEditIsLive && canEdit);
			historyList.forEach (function(histItem) {
				if (ignoreFirstInList) {
					ignoreFirstInList=false;
				} else {
					let hasChanges = !(Object.keys(histItem.changedRecords).length === 0 && histItem.changedRecords.constructor === Object)
					if (histItem.listoryNote || hasChanges){
						if (histItem._owner && histItem._owner!=freezr_user_id) {
							changes.appendChild(dg.span(
							{'style':{'font-style':'italic','color':'black'}},(""+histItem._owner+" - ")))
						}
						changes.appendChild(dg.span(
							{'style':{'font-style':'italic'},
							 'id':'feedsee_'+histItem._id || histItem.fj_local_temp_unique_id,
							 'title': 'Change Date:'+dateTimeStringFromFeed(histItem)+(histItem.accepted?('and date accepted:'+new Date(histItem._date_Modified).toString()):(histItem.rejected?('and date rejected: '+new Date(histItem._date_Modified).toString()):"")),
							 onclick: function(e){if (canEdit) setUpToBackDate(e.target, histItem, options.fulldata)} 
							},
							dateStringFromFeed(histItem)+": "))
					
						if (hasChanges) {
							let firstOne = true;
							Object.keys(histItem.changedRecords).forEach(function(aParam) {
								if (!firstOne) changes.appendChild(dg.span({className:'spacer'},"- "))
								changes.appendChild(dg.span(aParam+(histItem.accepted?" changed to ":(histItem.rejected?" was not changed to ":" to be changed to "))))
								changes.appendChild(dg.span({style:{color:(histItem.accepted?'lightseagreen':(histItem.rejected?'indianred':'blue'))}},""+histItem.changedRecords[aParam]))
								if (histItem.listoryChangeMade){
									changes.appendChild(dg.span({style:{color:"black"}},(histItem.accepted?"(Accepted  by ":"(Rejected by ")+histItem.listoryChangeMade.changedObjOwner+")"))
								} else if (histItem.listoryChangeProposed) {
									changes.appendChild(dg.span({style:{color:"black"}},(histItem.accepted?" (Accepted  by ":" (Rejected by ")+histItem.listoryChangeProposed[0].changedObjOwner+")"))	
								}
								changes.appendChild(dg.br())
								firstOne = false
							})
						}
						if (histItem.listoryNote) {
							changes.appendChild(dg.div({className:'linebreak',style:{color:(histItem.accepted?'lightseagreen':(histItem.rejected?'indianred':'blue'))}},histItem.listoryNote));
						}
		
						if (!histItem.accepted && !histItem.rejected && canEdit) {
							changes.appendChild(dg.div({style:{'width':'100%','text-align':'center', 'border-bottom':'1px grey dotted'}},
								dg.button(
									{className:'smallButt smallFaButtText',
									'style':{'margin-right':'5px'},
									'id':'lsDetailsRec_'+recId+"_acceptButt",
									'onclick': function(e) {saveRecordChanges(recId, recIdType, false, idAndTypeFromRec(histItem) )}, 
									},"Accept"
								),
								dg.span("or "),
								dg.button(
									{className:'smallButt smallFaButtText',
									'style':{'margin-right':'5px','color':'indianred'},
									'id':'lsDetailsRec_'+recId+"_rejectButt",
									'onclick': function(e) {saveRecordChanges(recId, recIdType, true, histItem)}, 
									},"Reject"
								)
							))
						}	
						wrapper.appendChild(changes);
					}
				}
			})
		}
		wrapper.appendChild(
			dg.div({style:{'text-align':'center', 'margin-top':'15px'}},
				dg.button(
					{className:'smallButt smallFaButtText',
					'style':{'margin-right':'10px'},
					'id':'lsDetailsRec_'+recId+"_moreButt",
					'onclick': options.fulldata? 
						function(e) {getOlderRecFeedItems(e, {recordId:recId})}: 
						function(e) {showFullRecordDetails(recId, recIdType, false)} 
					}, 
					(options.fulldata? "More Online" : "More Details")),
				dg.button(
					{className:'smallRedButt smallFaButtText',
					style: {display:canEdit?"inline-block":"none"},
					'id':'lsDeleteRec_'+recId+"_"+recIdType+"_deleteButt",
					'onclick': function(e) {deleteRecord(recId, recIdType, false)} 
					}, 
					"Delete Record")
			))
		return wrapper;
	}
	let setUpToBackDate = function(target, histItem, fulldata) {
		if (fulldata) {
			console.log(target.id+ " "+fulldata)
			let newDiv = dg.div(dg.div({
				contentEditable:true,
				style:{color:'blue','display':'inline-block'},
				'id':'feedRec_'+idAndTypeFromRec(histItem),
			}, dateTimeStringFromFeed(histItem)),
			dg.button(
				{className:'smallButt smallFaButtText',
				 style: {'margin-left':'5px'},
				 onclick: function(e) {
				 	let changedDiv = dg.el('feedRec_'+idAndTypeFromRec(histItem));
			 		let newDate = new Date(changedDiv.innerText);
			 		if (isNaN(newDate)) {
			 			showWarning("date has to be formatted correctly!",2000)
			 		} else {
				 		let feeditem = listory.get('feed', (histItem._id || histItem.fj_local_temp_unique_id), {idType:histItem.idType})
				 		if (!feeditem.backdates) feeditem.backdates = [];
				 		feeditem.backdates.push({date:new Date().getTime(),mod:'listoryDate',oldVal:(feeditem.listoryDate || feeditem.fj_modified_locally || feeditem._date_Modified)})
				 		feeditem.listoryDate = newDate.getTime();
				 		feeditem.fj_modified_locally = new Date().getTime()
				 		target.style.display="block";
				 		target.innerText = dateStringFromFeed(feeditem);
				 		target.title = dateTimeStringFromFeed(feeditem);
				 		listory.save();
				 		removeDiv(e.target);
				 		removeDiv(changedDiv)
					}
				 		
				 }
				},
				'Back-date feed changes')
			)
			target.style.display="none"
			target.parentNode.insertBefore(newDiv, target);

		}
	}

	let panel = dg.div(
		{'className':'lsNoteHolder'},
		dg.span({'style':{'display':(canEdit?"inline-block":"none"),'width':'100%'}},
			dg.div({'style':{'font-size':'10px','color':'darkgrey'}},"Note / Task:"),
			dg.div(
				{'id':"lsDetailsRec_"+ recId+"_"+recIdType +"_listoryNote",
				 'className':'lsNoteEntry',
				 'contentEditable':'true',
				 'data-placeholder':"Enter new note", 
				 'onkeydown': function(e) {
						if (e.keyCode == 9) {
							e.preventDefault();
							if (dg.el("lsRec_"+recId+"_"+recIdType+"_listorySave")) dg.el("lsRec_"+recId+"_"+recIdType+"_listorySave").focus();
						} else {
							e.target.style.color = CHGED_FIELD_COLOR;
							dg.el("lsChangesForRec_"+recId).style.display = 'block';
							if (dg.el("lsRec_"+recId+"_"+recIdType+"_listorySave")) dg.el("lsRec_"+recId+"_"+recIdType+"_listorySave").style.color = CHGED_FIELD_COLOR;
							//dg.el("click_saveCurrentRec_0").className = "smallButt";
							updateFeedFromChangesToElement(e.target);
							if (shownList.saveTimeout) clearTimeout(shownList.saveTimeout)
							shownList.saveTimeout = setTimeout(saveListory,2000)
						}
					}
				},
				feedText),
			),
		savedDiv,
		dg.div(
			{style:{
				'text-align':'center',
				'margin':'5px',
				'display': (unaccepteds > 0 && canEdit)? "block":"none"
			 },
			 'id':'lsChangesForRec_'+recId
			},
			dg.div({style:{'min-height':'10px'}}),
			dg.span(
				{className:'smallButt smallFaButtText',
				'style':{'margin-right':'10px'},
				'id':'lsSaveRec_'+recId+"_"+recIdType,
				'onclick': function(e) {
					splits = e.target.id.split("_")
					//onsole.log("save new id "+e.target.id)
					saveRecordChanges(splits[1], splits[2], false)} 
				},
				"Accept"),
			dg.span(
				{className:'smallButt smallFaButtText',
				style: {'color':'indianred','margin-right':'10px'},
				'id':'lsRejectRec_'+recId+"_"+recIdType,
				'onclick': function(e) {
					splits = e.target.id.split("_")
					//onsole.log("reject new id "+e.target.id)					
					saveRecordChanges(splits[1], splits[2], true)} 
				}, 
				"Reject"),
			dg.span(
				{className:'smallButt smallFaButtText',
				'style':{'margin-right':(hasOtherChanges?'10px':'0px')},
				'id':'lsRejectRec_'+recId+"_"+recIdType,
				'onclick': function(e) {
					splits = e.target.id.split("_");
					let recId=splits[1], recIdType=splits[2];  
					makeNewFeedItem({recordId:recId, recordIdType:recIdType});
					dg.el((options.fulldata?"fullRecordRecentHistory":"lsNotes_"+recId+"_"+recIdType),{'clear':true}).appendChild(drawRecentRecordHistory(shownRecord, {'fulldata':false /*if false, then summary shown */}));
					resetHeaderLengths();
					shownList.lastFeedChged = null;
					setTimeout(function(){dg.el("lsDetailsRec_"+recId+"_"+recIdType+"_listoryNote").focus();},0) 
					}
				},
				"New Note"),
			dg.span(
				{className:'smallButt smallFaButtText',
				'style':{'margin-right':'10px', display:(hasOtherChanges? null:"none")},
				'id':'lsSaveRec_'+recId+"_"+recIdType,
				'onclick': function(e) {
					splits = e.target.id.split("_")
					//onsole.log("save new id "+e.target.id)
					saveRecordChanges(splits[1], splits[2], false)} 
				},
				"Accept All"),
			dg.span(
				{className:'smallButt smallFaButtText',
				style: {'color':'indianred', display:(hasOtherChanges? null:"none")},
				'id':'lsRejectRec_'+recId+"_"+recIdType,
				'onclick': function(e) {
					splits = e.target.id.split("_")
					//onsole.log("reject new id "+e.target.id)					
					saveRecordChanges(splits[1], splits[2], true)} 
				}, 
				"Reject All"),
			dg.div({style:{'min-height':'10px'}}),

			),
		drawHistory(options)
	)
	return panel
}
var populateSumCell = function (aParam,type){
	if (shownList.sums[aParam]) {
		let average = Math.round((shownList.sums[aParam].sum/shownList.sums[aParam].countNum))
		// todolater - et rounding better - count max decimans
	
		if (viewGridIsListView() ) {
			if (dg.el('lsSum_'+aParam+"_count")) {
				dg.el('lsSum_'+aParam+"_count").innerHTML = shownList.sums[aParam].countNum;
				dg.el('lsSum_'+aParam+"_sum").innerHTML = shownList.sums[aParam].sum;
				dg.el('lsSum_'+aParam+"_avg").innerHTML = average;
			}
		} else {
			if (!type) type = (dg.el('lsSumToggle').innerText == "∑")?"sum":"average";
			if (dg.el('lsSum_'+aParam) && shownList.sums[aParam]) dg.el('lsSum_'+aParam).innerText= (type == "sum"? shownList.sums[aParam].sum : average) 
		}
	}
	
}
var updateFeedWithChange = function(e) {
	//onsole.log("updateFeedWithChange "+e.target.id)
	e.target.style.color = isANumber(e.target.innerHTML)? UNSUMMED_NUM_COLOR: CHGED_FIELD_COLOR;
	if (dg.el("lsChangesForRec_"+e.target.id.split('_')[1])) dg.el("lsChangesForRec_"+e.target.id.split('_')[1] ).style.display = 'block';

	if (viewGridTableIsFixed()) resetHeaderLengths();

	//onsole.log("updateFeedWithChange REC CHANGE+++++++" + e.target.id)
	setTimeout(function() {
			//onsole.log("Changed "+e.target.id)+" to "+e.target.value+"!!";
			updateFeedFromChangesToElement(e.target);
			if (shownList.saveTimeout) clearTimeout(shownList.saveTimeout)
			shownList.saveTimeout = setTimeout(saveListory,2000)
	},0)
}
// List Detail updating and saving
var updateFeedFromChangesToElement = function(target){
	// trigerred on key down etc when a cell is being changed. it updates the feed and shownList
	let parts = target.id.split('_');
	let recId = parts[1];
	let recIdType = parts[2];  
	let isDetailsView = (parts[0] == "lsDetailsRec");
	shownList.lastRecChgId = recId;
	shownList.lastRecChgIdType = recIdType;

	//onsole.log("changing rec "+recId+" - "+recIdType)

	if (dg.el("lsRec_"+recId+"_"+recIdType+"_listorySave")) dg.el("lsRec_"+recId+"_"+recIdType+"_listorySave").style.color = CHGED_FIELD_COLOR;

	// if shownList.lastFeedChged is not correct, find corrrect feed item
	if (!shownList.lastFeedChged || shownList.lastFeedChged.listoryId != shownList.listoryId || shownList.lastFeedChged.listoryIdType != shownList.listoryIdType || shownList.lastFeedChged.recordId !=parts[1] || shownList.lastFeedChged.rejected || shownList.lastFeedChged.accepted || (shownList.lastFeedChged._owner && shownList.lastFeedChged._owner != freezr_user_id)) {
		//onsole.log("NEW RECORD BEING CHANGED - re-qeury to find correct feed iten num");
		
		let historyList = listory.queryObjs("feed",{listoryId:shownList.listoryId, listoryIdType:shownList.listoryIdType, recordId:recId});
		historyList.sort(acceptanceSorter);
		shownList.lastFeedChged = (historyList && historyList.length>0 && !feedisAccOrRej(historyList[0]) && (!historyList[0]._owner || historyList[0]._owner == freezr_user_id))? historyList[0]: null;
	}

	if (!shownList.lastFeedChged) {
		shownList.lastFeedChged = makeNewFeedItem ({
			recordId: recId,
			recordIdType: recIdType,
			notes:""
		})
	} 
	markShowingListMetaAsModified();
	markRecordAsModified(recId, recIdType)
	if (dg.el("lsRec_"+recId+"_"+recIdType+"_listoryDate")) dg.el("lsRec_"+recId+"_"+recIdType+"_listoryDate").innerHTML = new Date().toLocaleDateString() + "<br/> " + new Date().toLocaleTimeString();
	setTimeout(function() {
		let theParam = parts[3];
		if (theParam== "listoryNote") {
			shownList.lastFeedChged[theParam] = target.innerText;
		} else {
			let theValue = target.innerText;
			if (paramTypeinCurrentList(theParam) == "multichoice") {
				theValue=target.value
				if (isDetailsView && dg.el("lsRec_"+recId+"_"+recIdType+"_"+theParam)) dg.el("lsRec_"+recId+"_"+recIdType+"_"+theParam).value = theValue 
			} else if (paramTypeinCurrentList(theParam) == "boolean") {
				theValue=target.checked
				if (isDetailsView && dg.el("lsRec_"+recId+"_"+recIdType+"_"+theParam)) dg.el("lsRec_"+recId+"_"+recIdType+"_"+theParam).checked = theValue
			} else {
				if (isDetailsView && dg.el("lsRec_"+recId+"_"+recIdType+"_"+theParam)) dg.el("lsRec_"+recId+"_"+recIdType+"_"+theParam).innerText = theValue
			}
			shownList.lastFeedChged.changedRecords[parts[3]] = theValue;
		}
		shownList.lastFeedChged.fj_modified_locally = new Date().getTime();
		shownList.lastFeedChged.listoryDate = new Date().getTime();
		saveListory();
		//onsole.log(shownList.lastFeedChged);
		updateRecordsShownListWithFeed(shownList.lastFeedChged, {target: target});
	},0)

};
var makeNewFeedItem = function( options = {} ) {
	let feedRec = {
		listoryId: options.listoryId || shownList.listoryId,
		listoryIdType: options.listoryIdType || shownList.listoryIdType, 
		accepted: options.accepted || false,
		rejected: options.rejected || false,
		recordId: options.recordId,
		recordIdType: options.recordIdType,
		changedRecords: {},
		notes: (options.notes || "")
	}
	return listory.add("feed",feedRec)
}

var removeOrphanFeedItems = function() {
	for (var i = listory.data.feed.length; i>0; i--) {
		let feedObj = listory.data.feed[i-1];
		if (feedObj.recordIdType =="dbid") {
			let shownListIndex =  indexInList("_id", feedObj.recordId, listory.data.records);
			if (shownListIndex<0) {
				console.warn("could not find record in shwonlist for feedObj "+i-1+": "+new Date (feedObj._date_Modified),feedObj)
				//listory.data.feed.splice(i-1,1)
			}	
		} else {
			console.log("deal with temp id's separately")
		}
	}
}

var updateRecordsShownListWithFeed = function(feedObj, options = {}) {
	// updates shownList.recordsShown based on a new feedObj
	// options.target for special case below, 
	// options.accepted, or options.rejected to accept or reject, and if they are not present, we are updating the data in the feedObj
	// options.secondTime means it has retried finding the record
	if (feedObj.listoryId == shownList.listoryId && feedObj.listoryIdType == shownList.listoryIdType) {

		let shownListIndex =  feedObj.recordIdType =="dbid"? indexInList("_id", feedObj.recordId, shownList.recordsShown) : indexInList("fj_local_temp_unique_id", feedObj.recordId, shownList.recordsShown);

		if (shownListIndex<0) {
			//onsole.warn("could not find record in shwonlist for feedObj ",feedObj)
			if (!options.secondTime) setTimeout(function(){
				options.secondTime=true;
				updateRecordsShownListWithFeed(feedObj,options)
			},0)
		} else {
			//onsole.log("shownList.recordsShown[shownListIndex] "+JSON.stringify(shownList.recordsShown[shownListIndex]))
			let shownRecord = shownList.recordsShown[shownListIndex];
			shownRecord._savedParams = shownRecord._savedParams || {};
			Object.keys(feedObj.changedRecords).forEach(function(aParam) {
				if (!options.accepted && !options.rejected){
					if (!shownRecord._savedParams[aParam]) shownRecord._savedParams[aParam] = shownRecord[aParam];
					shownRecord[aParam] = feedObj.changedRecords[aParam];
				} else if (options.accepted) {
					delete shownRecord._savedParams[aParam]
				} else if (options.rejected) {
					shownRecord[aParam] = shownRecord._savedParams[aParam];
					delete shownRecord._savedParams[aParam];
				}
			})
			if (options.newDate) shownRecord.fj_modified_locally = new Date().getTime();

			if (options.target) {
				let parts = options.target.id.split('_');
				let theParam = parts[3];
				// todo later - a nit exception: when a number is turned into a NaN colors dont show correctly... need to use _numFields to see if it had ever been a number and then color it red
			}
		}			
	} else {
		showWarning("Internal error - wring list - please refresh")
	}
}
var saveRecordChanges = function(recId, recIdType, rejected=false, oneFeed=null) {
	// triggered when button is pushed to save or reject changes	
	//onsole.log("saveRecordChanges "+recId+" typ "+recIdType+" onefeed? ",(oneFeed?oneFeed:"all feeds"))
	let feedErr = false;
	if (typeof oneFeed=="string") {
		oneFeed = listory.get("feed", oneFeed.split("_")[0])
		if (!oneFeed) {
			console.warn("Could not get feed item from id");
			feedErr = true;
		}
	}

	let unchangedFeedList = oneFeed? [oneFeed]: listory.queryObjs("feed", {listoryId:shownList.listoryId, listoryIdType:shownList.listoryIdType, recordId:recId, recordIdType: recIdType, accepted:false, rejected:false});
	unchangedFeedList = unchangedFeedList.sort(dateSorter).reverse()

	let recObj  = listory.get("records",recId, {idType:recIdType})

	canEdit = currentUserCanEditRecordinList(recObj)
	
	if (feedErr || recObj == undefined || unchangedFeedList.length<1) {
		console.log("err ",recId, recIdType,listory.get("records",recId))
		showWarning("Error finding record. You may need to refresh",10000)
	} else if (!canEdit){
		console.log("err ",recId, recIdType,listory.get("records",recId))
		showWarning("Error. You are not allowed to change this record.",10000)		
	} else {
		// Change records
		let recObjectToMark = null, recChangeObj = null;
		
		unchangedFeedList.forEach(feedObj =>{

			// Change Feed Item - acceptor accepting a feed item created by someone else. (so feed_item is always dbid)
			let feedObjectToMark = null, feedChangeObj = null;
			if (isOwnedObject(feedObj)) {
				feedObj.fj_modified_locally = new Date().getTime();
				feedObjectToMark=feedObj
			} else {
				feedChangeObj = makeNewChangeitem("saveOthersFeed",feedObj);
				feedObjectToMark = feedChangeObj.changes
			}
			feedObjectToMark.accepted = !rejected;
			feedObjectToMark.rejected = rejected;
			feedObjectToMark.listoryDate = feedObj.listoryDate || feedObj.fj_modified_locally || feedObj._date_Modified;
			feedObjectToMark.accOrRejDate = new Date().getTime();

			// Change Record Item
			if (isOwnedObject(recObj)){
				recObj.fj_modified_locally = new Date().getTime();
				recObjectToMark = recObj;
			} else if (recChangeObj){
				recChangeObj.recfeedIds.push(idAndTypeFromRec(feedObj) )
			} else {
				recChangeObj = makeNewChangeitem("saveOthersRec",feedObj, recObj);
				recObjectToMark = recChangeObj.changes
			}
			Object.keys(feedObj.changedRecords).forEach(function(aParam) {
				if (!rejected) recObjectToMark[aParam] = feedObj.changedRecords[aParam];
			})
			recObjectToMark.listoryDate = Math.max((recObj.listoryDate || 0),feedObj.listoryDate);

			
			// Change appearances
			let partZeroes = ["lsRec_","lsDetailsRec_"]
			partZeroes.forEach(aDivNamePart0 => {
				Object.keys(feedObj.changedRecords).forEach(function(aParam) {
					let theEl = dg.el(aDivNamePart0+recId+"_"+recIdType+"_"+aParam);
					if (!theEl){
						// saving a changed feed element which is not being shown
					} else if (!rejected) {
						theEl.style.color = DEFAULT_COLOR;
					} else  { // rejected
						theEl.style.color = DEFAULT_COLOR;;
						let fieldType = paramTypeinCurrentList(aParam);
						if (fieldType == 'multichoice') {
							theEl.value = recObj[aParam];
						} else if (fieldType == 'boolean') {
							theEl.checked = recObj[aParam]? true:false
						} else {
							theEl.innerText = recObj[aParam]
						}
					}
				})	
			})

			updateRecordsShownListWithFeed(feedObj, {accepted: (!rejected || false), rejected:(rejected || false), 'newDate':true});

			if (rejected) {Object.keys(feedObj.changedRecords).forEach(function(aParam) {doSumsForShownField(aParam,{doShow:true})})}


		})
		markShowingListMetaAsModified();
		saveListory();

		// Change appearances
		if (dg.el("lsRec_"+recId+"_"+recIdType+"_listorySave"))dg.el("lsRec_"+recId+"_"+recIdType+"_listorySave").style.color = 'lightgrey'
		//onsole.log(recObj)
		shownList.lastRecChgId= null;
		shownList.lastRecChgIdtype= null;
		shownList.lastFeedChged= null;

		listory.save();

		if (dg.el("lsNotes_"+recId+"_"+recIdType)) {
			dg.el("lsNotes_"+recId+"_"+recIdType,{'clear':true}).appendChild(drawRecentRecordHistoryFromIds(recId, recIdType, {'fulldata':false /*if false, then summary shown */}));
			resetHeaderLengths();
		}

		if (oneFeed) {
			// refresh from unsaved feeds in case accepted item has been changed twice
			let unchangedFeedList = listory.queryObjs("feed", {listoryId:shownList.listoryId, listoryIdType:shownList.listoryIdType, recordId:recId, recordIdType: recIdType, accepted:false, rejected:false});
			unchangedFeedList = unchangedFeedList.sort(dateSorter).reverse()
			unchangedFeedList.forEach(feedObj => {updateRecordsShownListWithFeed(feedObj)})

			let allUnchangedFeeds = listory.queryObjs("feed", {listoryId:shownList.listoryId, listoryIdType:shownList.listoryIdType, recordId:recId, recordIdType: recIdType, accepted:false, rejected:false});
			allUnchangedFeeds = allUnchangedFeeds.sort(dateSorter).reverse()

			allUnchangedFeeds.forEach(feedObj2 =>{
				if (oneFeed.id != feedObj2.id) updateRecordsShownListWithFeed(feedObj2)
			})
		}
		if (oneFeed || rejected ) {
			let recordShown = firstObjInList(shownList.recordsShown, (recIdType=="localtemp"? {"fj_local_temp_unique_id":recId}: {'_id':recId}) );
			recolorUnSavedPartsOfRecord(recordShown, {fulldata:true})
		}

		trySyncing();

		
	}
}
var makeNewChangeitem = function (type,mainObj,recObj) {
	// type can be saveOthersFeed or saveOthersRec or removeUserFromList or listUpdated
	// note mainObj can be the feedObj or other object
	obj = {
		type: type,
		listoryId:mainObj.listoryId,
		recordId:(type=="removeUserFromList" || type=="listUpdated")? null : mainObj.recordId, 
		userid:   type=="removeUserFromList"? mainObj.userid: null, 
		feedId:   type=="saveOthersFeed"?     mainObj._id : null,
		recfeedIds: ((type=="saveOthersFeed" || type=="removeUserFromList" || type=="listUpdated")? null:[ idAndTypeFromRec(mainObj) ]),
		theOwner: ((type=="saveOthersFeed" || type=="removeUserFromList")? mainObj._owner:recObj._owner),
		changes:{},
		closed:false
	}
	return listory.add("changes",obj)
}
var isOwnedObject = function (anObj) {
	return (!anObj._owner || anObj._owner==freezr_user_id)
}

var saveAllRecordChanges = function() { // only for current list
	listory.data.feed.forEach(function(aFeed) {
		if (aFeed.listoryId == shownList.listoryId && aFeed.listoryIdType == shownList.listoryIdType && !aFeed.accepted) {
			saveRecordChanges(aFeed.recordId, aFeed.recordIdType, false);
		}
	})
}
var markShowingListMetaAsModified = function() {
	// updated modified date on the list met when a record has changed
	// to do  - how to add idType
	if (!shownList.listMeta._owner || shownList.listMeta._owner==freezr_user_id) {
		return listory.updateItemFields("listMeta",shownList.listoryId);
	} else {
		theList = listory.get("listMeta",shownList.listoryId)
		if (theList) theList.listoryDate = new Date().getTime(); // todo nb cheating a bit by changing it localy without syncing some else's record todo - when sync and get some else's records, should do the same locally at _owner's session
		console.log("should update listory date via a changed object so others see the updated date too")
	}
}
var markRecordAsModified = function(recId, recIdType) {
	// updated modified date on the list met when a record has changed
	// to do  - how to add idType
	return listory.updateItemFields("records",recId, null, false);
}
var saveListory = function() {
	//onsole.log("Saved listory"); 
	listory.save();
	if (shownList.syncTimeout) clearTimeout(shownList.syncTimeout)
	//shownList.syncTimeout = setTimeout(trySyncing,60000)
}
// List Detail Actions
var addNewBlankRow = function() {
	let newRecord = {
		listoryId: shownList.listoryId,
		listoryIdType: shownList.listoryIdType,
		recordIdType: "localtemp"
	}
	newRecord = listory.add("records",newRecord);
	shownList.recordsShown.push(JSON.parse(JSON.stringify(newRecord)))
	markShowingListMetaAsModified();
	let newFeed = makeNewFeedItem({
		listoryId: shownList.listoryId,
		listoryIdType: shownList.listoryIdType, 
		listoryDate: new Date().getTime(),
		recordId: newRecord.fj_local_temp_unique_id,
		recordIdType: "localtemp",
		changedRecords: {},
		notes: "new record"
	})

	if (viewGridIsListView()) {
		showFullRecordDetails(newRecord.fj_local_temp_unique_id,  "localtemp", false)
	} else {
		theRow = dg.row(newRecord, allRecordsTableViewOptions(), ++shownList.lastRowNum)
		if (isEmpty(shownList.sums) ) {
				dg.el("listDetailsBody").appendChild(theRow)
				try {dg.el("listDetailsBody").lastChild.firstChild.nextSibling.nextSibling.focus()} catch(e) {console.log("didnt find 2")/* it's olay*/}
		} else {
				dg.el("listDetailsBody").insertBefore(theRow,dg.el("listDetailsBody").lastChild)
				try {dg.el("listDetailsBody").lastChild.previousSibling.firstChild.nextSibling.nextSibling.focus()} catch(e) {console.log("didnt find 2")/* it's olay*/}
			}
	}
	saveListory();
	//onsole.log(theRow);
}
var deleteRecord = function (recId, recIdType) {
	if (confirm("Are you sure you want to delete this whole record (row) ?")) {
		let theRecord = listory.markDeleted("records", recId, {'removeAllFields':false, 'idType':recIdType});
		if (theRecord) {
			let feedRec = {
				listoryId: shownList.listoryId,
				listoryIdType: shownList.listoryIdType, 
				accepted: true,
				rejected: false,
				recordId: recId,
				recordIdType: recIdType,
				changedRecords: theRecord,
				notes:"record deleted"
			}
			listory.add("feed",feedRec)
			shownList.lastFeedChged = null;
		} else {showAlert("Internal Error - Could not find record to delete.",3000)}
		// cleanup later: consider also marking records and feeds as belonging to a deleted list
		showListDetails(shownList.listoryId, {idType:shownList.listoryIdType});
	}
}
var showCurrentListMeta = function() {
	showListMetaDetails(listory.get('listMeta', shownList.listoryId, {idType:shownList.listoryIdType}), {source:'showListDetails'} )
	//
}
// Lit detail utilities
var listfromCSV = function(aText) {
	let aList = aText.split(",");
	for (let i=0; i<aList.length;i++) {aList[i] = aList[i].trim()};
	return aList;
}
var paramTypeinCurrentList = function(aParam) {
	theType = null;
	shownList.listMeta.fields.forEach(fieldDef => {
		if (fieldDef.name == aParam) theType = fieldDef.type;
	})
	return theType;
}


// Full record details
var showFullRecordDetails = function (recId, recIdType) {
	// shows a new page with the dtails of the record

	let shownRecord = firstObjInList(shownList.recordsShown, (recIdType=="localtemp"? {"fj_local_temp_unique_id":recId}: {'_id':recId}) )

	let recInner = dg.populate("oneRecordInner", 
		dg.div({style:{'text-align':'center','width':'100%'}},
			dg.button({
				className:'smallButt smallFaButtText',
				onclick: function() {viewTransitionTo("recordDetailScreen", {doClose:true, 'source':'close'});}
				
			}, 'Close')
		),

		generateListViewOfRecord(shownRecord, {'editable':true, 'fulldata':true}),
		dg.span({'id':'fullRecordRecentHistory'},drawRecentRecordHistory(shownRecord, {'fulldata':true})),
		
		dg.div({style:{'text-align':'center','width':'100%','margin-top':'5px'}},
			dg.button({
				className:'smallButt smallFaButtText',
				onclick: function() {viewTransitionTo("recordDetailScreen", {doClose:true, 'source':'close'});}
				
			}, 'Close')
		))

	viewTransitionTo("recordDetailScreen", {doClose: false, source:"listDetails"});
	setTimeout(function() {recolorUnSavedPartsOfRecord(shownRecord, {fulldata:true})},1) 
}

// Feed View
var showFeedView = function(listoryId, listoryIdType) {
	if (listoryId) {
		shownList = iniitalizeShownList();
		shownList.listoryId = listoryId;
		shownList.listoryIdType = listoryIdType;
	}
	let feedInner = dg.div({style:{'size':'10px'}});

	let recInner = dg.populate("oneRecordInner", 
		dg.div({style:{'text-align':'center','width':'100%'}},
			dg.button({
				className:'smallButt smallFaButtText',
				onclick: function() {viewTransitionTo("recordDetailScreen", {doClose:true, 'source':'close'});}
				
			}, 'Close')
		),

		//generateListViewOfRecord(theRecord, {'editable':true, 'fulldata':true}),
		//drawRecentRecordHistoryFromIds(recId, recIdType, {'fulldata':true}),
		feedInner,

		dg.div({style:{'text-align':'center','width':'100%','margin-top':'5px'}},
			dg.button({
				className:'smallButt smallFaButtText',
				onclick: function() {viewTransitionTo("recordDetailScreen", {doClose:true, 'source':'close'});}
				
			}, 'Close')
	))	

	viewTransitionTo("feedViewScreen", {doClose: false, source:"listDetails"});

	if (shownList.listoryId) {
		feedInner.appendChild(dg.div("Changes to "+shownList.listMeta.name))
	}

	const MAXITEMS = 20;
	let counter = 0;
	for (var i = listory.data.feed.length-1; i>-1; i--) {
		let feeditem = listory.data.feed[i]
		if (!shownList.listoryId || (shownList.listoryId==feeditem.listoryId && shownList.listoryIdType ==feeditem.listoryIdType && feeditem.notes != "list changed")) { // feeditem.notes temp measure
			feedInner.appendChild(showFeedElement(feeditem))
			counter++
			if (counter > MAXITEMS) i=-2
		}
	}	
} 
var showFeedElement = function(feeditem) {
	let recordDiv = EMPTY_RECORD_DIV();
	recordDiv.id="feeditem_"+(feeditem._id?  (feeditem._id+"_dbid"): ( feeditem.fj_local_temp_unique_id+"_templocal"))
	recordDiv.style['font-size']='10px'

	// todonow get list meta from listory if not here... and get them all from online if not local.. 
	let listMeta = shownList.listMeta;

	let record = listory.get('records', feeditem.recordId, {idType:feeditem.recordIdType})

	if (!shownList.listoryId) {
		recordDiv.appendChild(dg.div("Changed list "+listMeta.name))
	}

	let metatext = dg.div(dg.span({style:{color:'darkgrey'}},(dateTimeStringFromFeed(feeditem)+ " - Record with ")))
	let mainFields = [];
	listMeta.fields.forEach(fieldDef => {if (fieldDef.main) mainFields.push(fieldDef)});
	if (mainFields.length == 0) mainFields.push(listMeta.fields[0]);
	mainFields.forEach(fieldDef => { 
		metatext.appendChild(dg.span({style:{color:'darkgrey'}},(fieldDef.displayName || fieldDef.name)+" : ")) 
		metatext.appendChild(dg.span({style:{color:'lightseagreen'}},record[fieldDef.name] + ", ") ) 
	})
	recordDiv.appendChild(metatext)

	let theView = listory.data.listoryViews[shownList.listoryId+"_"+shownList.listoryIdType]
	let fieldsToShow = theView.showFields?  listfromCSV(theView.showFields) : shownList.listMeta.fields;
	Object.keys(feeditem.changedRecords).forEach(fieldName => {
		let fieldDef = firstObjInList(shownList.listMeta.fields, {'name':fieldName});
		if (fieldName){
			recordDiv.appendChild(dg.div(
				dg.span({style:{color:'darkgrey'}},(fieldDef.displayName || fieldDef.name)+((feeditem.rejected || !feeditem.accepted)? ' edited to "':' changed to "' )), 
				dg.span({style:{'color':(!feeditem.accepted && !feeditem.rejected)?"blue":"black"}}, feeditem.changedRecords[fieldDef.name]),
				dg.span({style:{color:'darkgrey'}},'"')
			))
		}
	})
	if (feeditem.listoryNote) recordDiv.appendChild(
		dg.span({style:{color:'darkgrey'}},"Added note: ",
		dg.div({className:'linebreak',style:{color:(!feeditem.accepted && !feeditem.rejected)?"blue":"black"}},feeditem.listoryNote)))
	if (feeditem.notes) recordDiv.appendChild(dg.span("Note:"+feeditem.notes))
	if (feeditem.rejected) {recordDiv.appendChild(dg.span("Change Rejected."))}
	let buttons = dg.makeElement("center", {style:{padding:'5px'}},
		dg.button(
			{className:'smallButt smallFaButtText',
			'style':{'margin-right':'10px'},
			'onclick': function(e) {
				showFullRecordDetails(feeditem.recordId,  feeditem.recordIdType, false)
			}},
			"Record Details")
	);

	if (!feeditem.rejected && !feeditem.accepted) { 
		buttons.appendChild(dg.button(
			{className:'smallButt smallFaButtText',
			'style':{'margin-right':'10px'},
			'onclick': function(e) {
				saveRecordChanges(feeditem.recordId,  feeditem.recordIdType, false, feeditem);
				if (dg.el("feeditem_"+feeditem._id)) dg.el("feeditem_"+feeditem._id, {'clear':true}).appendChild(showFeedElement(feeditem))
				// todolater - replace above with a new dg.swap function
			} 
			}, 
			"Save Changes"));
		buttons.appendChild(dg.button(
			{className:'smallButt smallFaButtText',
			'onclick': function(e) {
				saveRecordChanges(feeditem.recordId,  feeditem.recordIdType, true, feeditem) 
				if (dg.el("feeditem_"+feeditem._id)) dg.el("feeditem_"+feeditem._id, {'clear':true}).appendChild(showFeedElement(feeditem))
				// todolater - replace above with a new dg.swap function
			}}, 
			"Reject Changes")
	)}
	recordDiv.appendChild(buttons);

	//

	return recordDiv
}

// ONLINE ACTIVITIES
var getOlderListsOnline = function(e, lastOldest) {
	//onsole.log("getting older lists from "+(new Date (lastOldest)))
	listory.getOlderItems("listMeta",{
		'addToJlos':true,
		'queryParams':null,
		'permissionName':'list_share',
		'lastOldest': (lastOldest || new Date().getTime()),
		'warningCallBack': function(returnJson) {showWarning((returnJson.msg || ("error: "+returnJson.error)),5000 )},
		'downloadedItemTransform': handleDownloadedRecordItem,
		'endCallBack': function(newItems,state) {
			//onsole.log("got list of len "+newItems.length)
			if (state.noMoreItems) {
				if (dg.el("butt_getMoreLists")) dg.el("butt_getMoreLists").style.display="none";
				//showWarning("No more items.",2000)
			} 
			if (!state.noMoreItems && newItems.length==0) {
				getOlderListsOnline(null, state.lastOldest)
			} else {
				showAllLists();
			}
		},
		'numItemsToFetchOnStart': NUM_LISTS_TO_DOWNLOAD
	})
}
var getOlderRecFeedItems = function(e, options) {
	//onsole.log("getOlderRecFeedItems")
	listory.getOlderItems("feed",{
		'addToJlos':true, 
		'permissionName':'list_share',
		'queryParams':{'listoryId':shownList.listoryId, 'recordId': options.recordId},
		'lastOldest': (options.lastOldest || new Date().getTime()),
		'warningCallBack': function(returnJson) {showWarning((returnJson.msg || ("error: "+returnJson.error)),5000 )},
		'downloadedItemTransform': handleDownloadedRecordItem,
		'endCallBack': function(newItems,state) {
			if (newItems.length>0) {};
			if (!state.noMoreItems) {
				setTimeout( function() {
					options.lastOldest = state.lastOldest;
					getOlderRecFeedItems(e, options)},0)
			} else {
				e.target.style.display="none"
			}
		},
		'numItemsToFetchOnStart': NUM_LISTS_TO_DOWNLOAD
	})
}

// Syncing Start and Lists
/* Sync Process 
- doPreSyncOfUniqueIds
- Then use frozen jloss to sync listMeta, feed, records and changes
- Changes get recorded when a user is not an owner of the record to change
	- 1. change items can be of type saveOthersFeed or saveOthersRec or removeUserFromList or listUpdated
	- 2. they are created when feed has changed etc by a non-owner with closed=false (for some)
	- 3. when a change item is downloaded, and user is the owner, the record is fixed and the item is changed and marked as having been changed under listoryChangeProposed (and for feeds, listoryChangeMade)
	- part 4. when a record/feed is updated, the owner of the "change" object marks "closed=true" 
	- 5. When theOwner of the original gets a "closed" change, it removed the listoryChangeProposed item

*/
var syncParams = {
	preSyncOn: false
}
var listoryIsSyncing = function() {
	//
	return  (listory.syncing || syncParams.preSyncOn) 
}
var doPreSyncOfUniqueIds = function(callFwd) {
	if (listoryIsSyncing() ) {
		console.log("Already syncing ",listory.syncing,syncParams.preSyncOn)
	} else {
		syncParams.preSyncOn = true;

		let i=-1; haveANewListToSync = false;
		while (!haveANewListToSync && listory.data.listMeta && ++i<listory.data.listMeta.length && listory.data.listMeta[i] && !haveANewListToSync) {
			if (!listory.data.listMeta[i]._id ) {
				haveANewListToSync = true;
			}
		}
		
		if (haveANewListToSync) {
			let metaToUpdate = listory.data.listMeta[i];
			freezr.db.query({'collection':'listMeta',query_params:{'_id':metaToUpdate.tempUniqueId}}, function(returnJson) {
				returnJson = freezr.utils.parse(returnJson);
				if (returnJson.error) {
					console.warn("GOT ERROR SYNCING",returnJson.error)
					syncParams.preSyncOn = false;
					callFwd? callFwd({error:true}) : endSync();
				} else {
					if (returnJson.results && returnJson.results.length>0) {

						let uniqueId = incrementName(listory.data.listMeta[i].tempUniqueId);

						for (var j=0; j<listory.data.listMeta.length; j++) {
							let madeChange = false
							let listRecord = listory.data.listMeta[j];
							while (i!=j && (listRecord.tempUniqueId == uniqueId || listRecord._id == uniqueId) ) {
								madeChange = true;
								uniqueId = incrementName(uniqueId);
							}
							if (madeChange == true) j=0;
						}
						
						listory.data.listMeta[i].tempUniqueId = uniqueId;
						syncParams.preSyncOn = false;
						
						doPreSyncOfUniqueIds(callFwd);


					} else if (metaToUpdate.tempUniqueId != listory.data.listMeta[i].tempUniqueId) {
						showWarning("There was a problem syncing. Please refresh if this persits",4000)
						// perhaps a list reshuffle on a slow connection
						console.warn("STRANGE ERROR - WNBH - tempUniqueId != listory.data.listMeta[i]")
						syncParams.preSyncOn = false;
						doPreSyncOfUniqueIds(callFwd);
					} else {
						let updateItem = JSON.parse(JSON.stringify(metaToUpdate));
						if (updateItem.fj_deleted && !updateItem._id){
							listory.data.listMeta.splice(i, 1);
							syncParams.preSyncOn = false;
							doPreSyncOfUniqueIds(callFwd);
						} else {
							delete updateItem.tempUniqueId;
							updateItem._id = metaToUpdate.tempUniqueId;
							let uploadOptions = {'collection':'listMeta', 'confirm_return_fields':['fj_local_temp_unique_id','_date_Created','_date_Modified','_id','fj_deleted']};
							freezr.db.write (updateItem, uploadOptions, function (returnData) {
								// check that the item id is correct - update the item and set modified to null;
								returnData = freezr.utils.parse(returnData);
								if (returnData.error) {
									console.warn("GOT ERROR WRITInG - todo handle better")
									syncParams.preSyncOn = false;					
									endSync();
								} else {
									if (returnData.confirmed_fields._id != listory.data.listMeta[i].tempUniqueId) {
										console.log("Wierd stuff - handle manually - perhaps research for tempUniqueId - or reorder list todo")
										syncParams.preSyncOn = false;
										doPreSyncOfUniqueIds(callFwd);
									} else {
										for (var j=0; j<listory.data.records.length; j++) {
											if (listory.data.records[j].listoryId == listory.data.listMeta[i].fj_local_temp_unique_id){
												if (listory.data.records[j].listoryIdType != "localtemp") {console.log("strange ERROR HERE ON listoryIdType "+listory.data.feed[j].listoryIdType)}
												listory.data.records[j].listoryId = returnData.confirmed_fields._id;
												listory.data.records[j].listoryIdType = "dbid" // dbid
											}
										}
										for (var j=0; j<listory.data.feed.length; j++) {
											if (listory.data.feed[j].listoryId == listory.data.listMeta[i].fj_local_temp_unique_id){
												listory.data.feed[j].listoryId = returnData.confirmed_fields._id;
												listory.data.feed[j].listoryIdType = "dbid"
											}
										}
										delete listory.data.listMeta[i].tempUniqueId
										shownList.listoryId = returnData.confirmed_fields._id;
										shownList.listoryIdType = "dbid"
										listory.data.listMeta[i]._id = returnData.confirmed_fields._id;
										listory.data.listMeta[i].fj_modified_locally = null;
										listory.data.listMeta[i]._date_Modified = returnData.confirmed_fields._date_Modified;
										delete listory.data.listMeta[i].fj_local_temp_unique_id;
										syncParams.preSyncOn = false;
										doPreSyncOfUniqueIds(callFwd);
									}
								}
							})

							//update all records and feed
							// go ahead and sync record and update all including lsit_metawith the new data
						}
					}
				}
			})
		} else {
			syncParams.preSyncOn = false;
			callFwd? callFwd({error:false}) : SyncListMeta();
		}
	} 
}
var trySyncing = doPreSyncOfUniqueIds;

const NUM_LISTS_TO_DOWNLOAD = 30;
var SyncListMeta = function() {
	listory.sync("listMeta", {
		warningCallBack: syncWarningCB,
		gotNewItemsCallBack: syncGotNewLists, 
		uploadedItemTransform: handleUploadedListMetaItem,
		downloadedItemTransform: handleDownloadedListMetaItem,
		uploadedItemCallback: uploadedListItemCB,
		endCallBack: syncRecords,
		doNotCallUploadItems: false,
		numItemsToFetchOnStart: NUM_LISTS_TO_DOWNLOAD,
		permissionName:"list_share"});
}
var syncWarningCB = function(msgJson) {
	if (msgJson && msgJson.msg) {
		showWarning("warning "+msgJson.msg, ( (msgJson.error && msgJson.error=="no connection")? 1000:5000) );
	} else { showWarning("inernal Error", 5000);}
	endSync();
}
var syncGotNewLists = function(newLists, changedLists) {
	//onsole.log("syncGotNewLists ",newLists)
	if (newLists && newLists.length>0) {
		showWarning("You have "+newLists.length+" new lists",3000);
	}
	if (shownList.mainPanelNowShowing == "allLists" && ( (newLists && newLists.length>0) || (changedLists && changedLists.length>0) ) ) {
		showAllLists();
	}
}
var uploadedListItemCB = function(listItemNumber, listLink) {
	// do nothing
	if (shownList.listoryId == listLink._id) shownList.listMeta = listLink;
}
var handleUploadedListMetaItem = function(aRecord) {
	if (!aRecord._id) {	
		return null; // ie don't sync lists which have not been pre-synced
	} else {
		return aRecord;
	}
} 
var handleDownloadedListMetaItem = null //  console.log(" handleUploadedListMetaItem - Add encryption here") - see notery

// Sync Records
var syncRecords = function() {
	listory.sync("records", {
		warningCallBack: syncWarningCB,
		gotNewItemsCallBack: syncGotNewRecords, 
		uploadedItemTransform: handleUploadedRecordItem,
		downloadedItemTransform: handleDownloadedRecordItem,
		uploadedItemCallback: uploadedRecordItemCB,
		endCallBack: syncFeed,
		doNotCallUploadItems: false,
		numItemsToFetchOnStart: NUM_LISTS_TO_DOWNLOAD,
		permissionName:"list_share"}
	);
}
var syncGotNewRecords = function(newRecords, changedRecords) {
	//onsole.log("syncGotNewRecords "+shownList.mainPanelNowShowing)
	if (newRecords && newRecords.length>0) showWarning("You have "+newRecords.length+" new records",3000);

	// In sharing, find and close change objects
	allRecords = newRecords.concat(changedRecords)
	if (allRecords && allRecords.length>0) {
		// part 4. when a record/feed is updated, theOwner of the "change" object marks "closed=true" 
		allRecords.forEach(aRecord => {
			if (aRecord._owner != freezr_user_id && aRecord.listoryChangeProposed && aRecord.listoryChangeProposed.length>0){
				let idx = firstIdxInList(aRecord.listoryChangeProposed, {'changedObjOwner':freezr_user_id})
				if (idx >-1) {
					let changeObj =  listory.get("changes",aRecord.listoryChangeProposed[idx].changedObjId)
					if (!changeObj || !isOwnedObject(changeObj)) {
						console.warn("could not find change object to close ",aRecord.listoryChangeProposed[idx], ( !changeObj? "": "Item not owned , so could be a 3rd user!!!!"))
					} else {
						changeObj.closed = true;
						changeObj.fj_modified_locally = new Date().getTime();
					}
				}
			}
		})
	}
	if (shownList.mainPanelNowShowing == "listDetails" && allRecords && allRecords.length>0 ) {
			// todo later.. can just add rows to make it cleaner
			let doRefresh= false;
			changedRecords.forEach(aRecord => {if (aRecord.listoryId == shownList.listoryId) doRefresh=true});
			if (doRefresh) showListDetails(); 
	}
}
var handleUploadedRecordItem = function(aRecord) {
	if (aRecord.listoryIdType=="localtemp") {	
		return null; // ie don't sync records whose list has not been synced yet
	} else {
		// console.log(" handleDownloadedListMetaItem - Add encryption here" todo)
		aRecord.recordIdType = "dbid";
		return aRecord;
	}
} 
var handleDownloadedRecordItem = null //  console.log(" handleUploadedListMetaItem - Add encryption here") - see notery
var uploadedRecordItemCB = function(rNum, recordLink) {
	theRec = listory.data.records[rNum];
	
	// fdo this with recordLink - it is better
	if (theRec.recordIdType == "localtemp") {
		theRec.recordIdType = "dbid";
		listory.data.feed.forEach(function(aFeed) {
			if (aFeed.recordIdType == "localtemp" && aFeed.recordId == theRec.fj_local_temp_unique_id) {
				aFeed.recordId = theRec._id;
				aFeed.recordIdType = "dbid"
			}
		})

		if (theRec.listoryId == shownList.listoryId) {
			
			let shownRecord = firstObjInList(shownList.recordsShown, {"fj_local_temp_unique_id":theRec.fj_local_temp_unique_id, "_id":null})
			if (shownRecord) {
				shownRecord.recordIdType = "dbid";
				shownRecord._id = theRec._id;
			} else {
				showWarning("Error getting record to update - you may want to refresh")
			}		
		
			Object.keys(shownList.headers).forEach(aParam => {
				//onsole.log("check id exists "+"lsRec_"+theRec.fj_local_temp_unique_id+"_localtemp_"+aParam)
				if (dg.el("lsRec_"+theRec.fj_local_temp_unique_id+"_localtemp_"+aParam)) {
					dg.el("lsRec_"+theRec.fj_local_temp_unique_id+"_localtemp_"+aParam).id="lsRec_"+theRec._id+"_dbid_"+aParam
				}  // else {("element does not exist")}
			})
			const RECS_TO_CHANGE = ['lsSaveRec','lsRejectRec']
			RECS_TO_CHANGE.forEach(preName => {
				if (dg.el(preName+"_"+theRec.fj_local_temp_unique_id+"_localtemp")) {
					dg.el(preName+"_"+theRec.fj_local_temp_unique_id+"_localtemp").id=preName+"_"+theRec._id+"_dbid"
				} else {console.log("did not find preName "+preName)}
			})
		}
	}
	let theList = listory.get('listMeta', theRec.listoryId)
	if (theList.sharing && theList.sharing.length>0) {
		if (!listory.data.shareSyncRecFeedStatus) listory.data.shareSyncRecFeedStatus = []
		theList.sharing.forEach(sharedObj => {if (sharedObj.name != freezr_user_id) listory.data.shareSyncRecFeedStatus.push ({'userid':sharedObj.name,'listoryId':theRec.listoryId, 'grant':true, collection:"records", theId:theRec._id})})
		listory.data.shareSyncRecFeedStatus.push ({'userid':theList._owner,'listoryId':theRec.listoryId, 'grant':true, collection:"records", theId:theRec._id})


	}
}

// Sync Feed
var syncFeed = function() {
	listory.sync("feed", {
		warningCallBack: syncWarningCB,
		gotNewItemsCallBack: syncGotNewFeeds, 
		uploadedItemTransform: handleUploadedFeedItem,
		downloadedItemTransform: handleDownloadedFeedItem,
		uploadedItemCallback: uploadedFeedItemCB,
		endCallBack: syncOthersChanges,
		doNotCallUploadItems: false,
		numItemsToFetchOnStart: NUM_LISTS_TO_DOWNLOAD,
		permissionName:"list_share"}
	);
}
var syncGotNewFeeds = function(newFeeds, changedFeeds) {
	//onsole.log("syncGotNewFeeds ",newFeeds)
	if (newFeeds && newFeeds.length>0) showWarning("You downloaded "+newFeeds.length+" new feeds",3000);

	allFeeds = newFeeds.concat(changedFeeds)
	if (allFeeds && allFeeds.length>0) {
		// part 4. when a record/feed is updated, theOwner of the "change" object marks "closed=true" 
		allFeeds.forEach(aFeed => {
			if (aFeed._owner != freezr_user_id && aFeed.listoryChangeProposed && aFeed.listoryChangeProposed.length>0){
				let idx = firstIdxInList(aFeed.listoryChangeProposed, {'changedObjOwner':freezr_user_id})
				if (idx >-1) {
					let changeObj =  listory.get("changes",aFeed.listoryChangeProposed[idx].changedObjId)
					if (!changeObj || !isOwnedObject(changeObj) ) {
						console.warn("could not find change obj to close ",aFeed.listoryChangeProposed[idx], ( !isOwnedObject(changeObj)? "Item not owned, so could be a 3rd user!!":""))
					} else {
						changeObj.closed = true;
						changeObj.fj_modified_locally = new Date().getTime();
					}
				}
			}
		})
	}


	if (shownList.mainPanelNowShowing == "listDetails" && ( (newFeeds && newFeeds.length>0) || (changedFeeds && changedFeeds.length>0) ) ) {
			// todo later.. can just update shownList and feed
			let doRefresh= false;
			changedFeeds.forEach(aFeed => {if (aFeed.listoryId == shownList.listoryId) doRefresh=true});
			if (doRefresh) showListDetails(); 
	}
}
var handleUploadedFeedItem = function(aFeed) {
	if (aFeed.listoryIdType=="localtemp" || aFeed.recordIdType == "localtemp") {	
		return null; // ie don't sync records whose list has not been synced yet
	} else {
		// console.log(" handleDownloadedListMetaItem - Add encryption here" todo)
		return aFeed;
	}
} 
var handleDownloadedFeedItem = null //  console.log(" handleUploadedListMetaItem - Add encryption here") - see notery
var uploadedFeedItemCB = function(rNum, feedCopy) {
	theFeed = listory.data.records[rNum];
	// todo update any existing records
	//onsole.log("uploadedFeedItemCB ", feedCopy)

	let theList = listory.get('listMeta', feedCopy.listoryId)
	if (theList.sharing && theList.sharing.length>0) {
		if (!listory.data.shareSyncRecFeedStatus) listory.data.shareSyncRecFeedStatus = []
		theList.sharing.forEach(sharedObj => {if (sharedObj.name != freezr_user_id) listory.data.shareSyncRecFeedStatus.push ({'userid':sharedObj.name,'listoryId':feedCopy.listoryId, 'grant':true, collection:"feed", 'theId':feedCopy._id})})

		listory.data.shareSyncRecFeedStatus.push ({'userid':theList._owner,'listoryId':feedCopy.listoryId, 'grant':true, collection:"feed", theId:feedCopy._id})

	}
}

// Sync Others' changes
var syncOthersChanges = function() {
	//onsole.log("Move to syncing syncOthersChanges");
	listory.sync("changes", {
		warningCallBack: syncWarningCB,
		gotNewItemsCallBack: syncGotNewOthersChanges, 
		uploadedItemTransform: null,
		downloadedItemTransform: null,
		uploadedItemCallback: uploadedChangeItemCB,
		endCallBack: setuserAccessForAllRecsFeedsChangesInList,
		doNotCallUploadItems: false,
		numItemsToFetchOnStart: NUM_LISTS_TO_DOWNLOAD,
		permissionName:"list_share"}
	);
}
var syncGotNewOthersChanges = function(newChanges, changedChanges) {
	//onsole.log("syncGotNewOthersChanges ",newChanges,changedChanges)
	let allChanges = newChanges.concat(changedChanges)
	if (allChanges && allChanges.length>0) {
		allChanges.sort(dateSorter).reverse()
		//onsole.log("You downloaded "+newChanges.length+" new change items, and changed ones of "+changedChanges.length);
		allChanges.forEach(aChange => { 
			if (aChange.theOwner == freezr_user_id && !aChange.closed && (aChange.type == "saveOthersFeed" || aChange.type == "saveOthersRec")) {
				// 3. when a change item is downloaded, and user is theOwner, the record is fixed and the item is changed and marked as having been changed under listoryChangeProposed (and for feeds, listoryChangeMade)
				let changedObj; // feed or record object
				try {
					changedObj = listory.updateItemFields(
						(aChange.type == "saveOthersFeed"? "feed":"records"),
						(aChange.type == "saveOthersFeed"? aChange.feedId:aChange.recordId),
						aChange.changes);
					if (!changedObj.listoryChangeProposed) changedObj.listoryChangeProposed = [];
					changedObj.listoryChangeProposed.push({'changedObjOwner':aChange._owner,'changedObjId':aChange._id})
					if (aChange.type == "saveOthersFeed") {
						changedObj.listoryChangeMade ={'changedObjOwner':aChange._owner,'changedObjId':aChange._id, 'accepted':aChange.changes.accepted , 'rejected':aChange.changes.rejected}
					}
					if (changedObj._owner!=freezr_user_id) console.warn("Here is error of writing to others object",changedObj,aChange)
				} catch (e) {console.warn("Feed not found. todo - look online",aChange)}
			} else if (aChange.theOwner == freezr_user_id && aChange.closed && (aChange.type == "saveOthersFeed" || aChange.type == "saveOthersRec") ) {
				// 5. When the theOwner of the original gets a "closed" change, it removed the listoryChangeProposed item
				let changedObj = listory.get((aChange.type == "saveOthersFeed"? "feed":"records"),
					(aChange.type == "saveOthersFeed"? aChange.feedId:aChange.recordId));
				if (changedObj){
					let idx = firstIdxInList(changedObj.listoryChangeProposed, {'changedObjOwner':aChange._owner,'changedObjId':aChange._id});
					if (idx>-1) changedObj.listoryChangeProposed.splice(idx,1);
					changedObj.fj_modified_locally= new Date().getTime();
					if (changedObj._owner!=freezr_user_id) console.warn("Here is error of writing to others object",changedObj,aChange);
				} else {
					console.warn("Feed not found. need to look online",aChange)
				}
			} else if (aChange.theOwner != freezr_user_id && aChange.type == "removeUserFromList" && aChange.userid == freezr_user_id) {
				if (shownList && shownList.listoryId == aChange.listoryId) {showAllLists();}
				listIdx = listory.idIndex("listMeta",{'_id':aChange.listoryId});
				if (listIdx>-1) {
					currentSettingIdx = firstIdxInList(listory.data.listMeta[listIdx].sharing,{'name':freezr_user_id});
					if (currentSettingIdx>-1) { //listMeta hasnt changed since then
						listory.data.listMeta.splice(listIdx,1);
						["records","feeds","changes"].forEach (aList => {listory.removeLocalCopy(aList, {'listoryId':aChange.listoryId}) })
						if (shownList.mainPanelNowShowing == "allLists")showAllLists();
					} 
				} else { console.log("couldnt find list to remove")}
				listory.save();
			}
		})
	}
}
var uploadedChangeItemCB = function(rNum, chgCopy) {
	// todo update any existing records?

	let theList = listory.get('listMeta', chgCopy.listoryId)
	if (theList.sharing && theList.sharing.length>0) {
		if (!listory.data.shareSyncRecFeedStatus) listory.data.shareSyncRecFeedStatus = []
		theList.sharing.forEach(sharedObj => {if (sharedObj.name != freezr_user_id) listory.data.shareSyncRecFeedStatus.push ({'userid':sharedObj.name,'listoryId':chgCopy.listoryId, 'grant':true, collection:"changes", 'theId':chgCopy._id})})

		listory.data.shareSyncRecFeedStatus.push ({'userid':theList._owner,'listoryId':chgCopy.listoryId, 'grant':true, collection:"changes", theId:chgCopy._id})

	}
}


// Granting permission to others - 
var haveListSharePerm = function(callFwd) {
	freezr.perms.getAllAppPermissions(function(jsonlist) {
		let havePerm = false;
		jsonlist = freezr.utils.parse(jsonlist)
		if (jsonlist.error) {
			callFwd({error:true})
		} else {
			jsonlist.forEach(aPerm => {
				if (aPerm.permission_name == 'list_share' && aPerm.granted) havePerm = true;
			})
			callFwd({'granted':havePerm})
		}
	})
}
var setuserAccessForAllRecsFeedsChangesInList = function() {
	// When list is first shared, all feed items get specified access rights
	allTypes = ["listMeta","records","feed","changes","done"]

	let haveAListToShare = false;
	let currentCollection;
	if (listory.data.shareSyncListStatus && listory.data.shareSyncListStatus.length>0) {
		let i=0; // Do listMeta items first, and then all others
		while(!haveAListToShare && listory.data.shareSyncListStatus && i<listory.data.shareSyncListStatus.length) {
			if (!listory.data.shareSyncListStatus[i].progress) {
				haveAListToShare = listory.data.shareSyncListStatus[i];
				currentCollection = allTypes[0]
			} else {i++} 
		}
		if (!haveAListToShare) {
			i= listory.data.shareSyncListStatus.length-1
			haveAListToShare = listory.data.shareSyncListStatus[i];
			currentCollection = haveAListToShare=="done"? "done" : allTypes[allTypes.indexOf(haveAListToShare.progress)+1]
		}

	}

	//onsole.log("haveAListToShare",haveAListToShare)
	if (currentCollection=="done") {
		listory.data.shareSyncListStatus.pop();
		setuserAccessForAllRecsFeedsChangesInList();
	} else if (!haveAListToShare) {
		grantAccessToNewFeedRecsChanges();
	} else if (!haveAListToShare.userid || !haveAListToShare.userid.trim() || haveAListToShare.userid==freezr_user_id) {
		haveAListToShare.progress="changes";
		setuserAccessForAllRecsFeedsChangesInList();
	} else {
	  haveListSharePerm(function(perm) {
		if (perm.granted) {
		 let accessCriteria = currentCollection=="listMeta"? haveAListToShare.listoryId: {'listoryId':haveAListToShare.listoryId};
		 if (currentCollection == "changes" && !haveAListToShare.grant) accessCriteria.type = {'$ne' : "removeUserFromList"}
		 freezr.perms.setObjectAccess("list_share", accessCriteria, 
		 		{'shared_with_user':haveAListToShare.userid, 
		 		 'action':(haveAListToShare.grant? "grant":"deny"),
		 		 'collection':currentCollection
		 		}, function(returnJson) {
		 	returnJson = freezr.utils.parse(returnJson)
			if (returnJson.error) {
				console.log("Error granting permission",returnJson)
				showWarning("Error granting permission.")
				endSync();
			} else {
				haveAListToShare.progress = currentCollection
				setuserAccessForAllRecsFeedsChangesInList();
			}				
		 })
		} else {
		 // known bug - if deny perm and then try to remvoe people
		 showWarning("If you want to share records, please click on the freezr button and grant the permission to this app.",4000);
		 endSync();
		}
	 })
	}
}
var grantAccessToNewFeedRecsChanges = function() {
	//onsole.log("listory.data.shareSyncRecFeedStatus",listory.data.shareSyncRecFeedStatus)
	if (listory.data.shareSyncRecFeedStatus && listory.data.shareSyncRecFeedStatus.length>0) {

	  haveListSharePerm(function(perm) {
		if (perm.granted) {
			let shareItemNum = listory.data.shareSyncRecFeedStatus.length-1;
			let shareItem = listory.data.shareSyncRecFeedStatus[shareItemNum]
			//onsole.log("sharing individual ones ",shareItem)
			if (shareItem.userid && shareItem.userid.trim()){
				freezr.perms.setObjectAccess("list_share", shareItem.theId, 
				 		{'shared_with_user':shareItem.userid, 
				 		 'action':(shareItem.grant? "grant":"deny"),
				 		 'collection':shareItem.collection
				 		}, function(returnJson) {
				 	returnJson = freezr.utils.parse(returnJson)
					if (returnJson.error) {
						console.warn(returnJson)
						showWarning("Error syncing - Please make sure you have granted permission.",4000)
						endSync();
					} else if (listory.data.shareSyncRecFeedStatus[shareItemNum].theId == shareItem.theId){
						listory.data.shareSyncRecFeedStatus.splice(shareItemNum,1)
						grantAccessToNewFeedRecsChanges();
					} else {
						console.warn("Sync error sharing record ",listory.data.shareSyncRecFeedStatus[shareItemNum].theId,shareItem.theId,shareItem)
						endSync();
					}			
				 })
			} else {
				listory.data.shareSyncRecFeedStatus.splice(shareItemNum,1)
				grantAccessToNewFeedRecsChanges();
			}
		} else {
			showWarning("If you want to share items, please click on the freezr button and grant the permission to this app.",4000);
			endSync();
		} 
	  })
	} else {endSync()}
}

// end Syncing
var endSync = function() {
	//console.log("SYNC WARNINGS TODO ")
	console.log(listory.syncWarnings)
	saveListory()
	// todo showsyncwarnings
}

// VIEW MAIN Rendering (Show / Hide Eements)
var warningTimOut = null;
var showWarning = function(msg, timing) {
	// null msg clears the message
	//onsole.log("warning "+msg)
	if (warningTimOut) clearTimeout(warningTimeOut);
	if (!msg) {
		document.getElementById("warnings").innerHTML = "";
		document.getElementById('warnings').style.display="none";
	} else {
		var newText = document.getElementById("warnings").innerHTML;
		if (newText && newText!=" ") newText+="<br/>";
		newText += msg;
		document.getElementById("warnings").innerHTML = newText;
		document.getElementById('warnings').style.display="block";
		if (timing) {warningTimeOut = setTimeout(function(){ showWarning(); }, timing);}
	} 
}


//  general array utility functions
var indexInList = function (param, value, refList) {
	var index = -1
	if(!param || !value || !refList || refList.length==0) return index;
	for (var i=0; i<refList.length; i++) {
		if (refList[i][param] && refList[i][param] == value) {
			index = i;
			break;
		}
	}
	return index;
}
var firstIdxInList  = function (refList, criteria) {
	// criteria
	var index = -1
	if(!criteria || !refList || refList.length==0) return index;
	for (var i=0; i<refList.length; i++) {
		let meetsCriteria = true
		Object.keys(criteria).forEach(aParam => {
			if (criteria[aParam] != refList[i][aParam]) meetsCriteria=false;
		})
		if (meetsCriteria) {
			index = i;
			break;
		}
	}
	return index
}
var firstObjInList  = function (refList, criteria) {
	// criteria
	var index = firstIdxInList(refList, criteria);
	if (index<0) {
		return null;
	} else {
		return refList[index]
	}
}
var idAndTypeFromRec = function(record) {
	if (record._id && record.recordIdType != "dbid") console.warn("id type for rec all wrong "+record._id+" "+record.recordIdType);
	if (record._id) return record._id+"_"+record.recordIdType;

	if (record.fj_local_temp_unique_id && record.recordIdType != "localtemp") console.warn("id type for rec all wrong "+record.fj_local_temp_unique_id+" "+record.recordIdType );
	if (record.fj_local_temp_unique_id) return record.fj_local_temp_unique_id+"_localtemp"
	return "header";
}
var idFromRec = function(record) {
	return record._id || record.fj_local_temp_unique_id;
}
var idTypeFromRec = function(record) {
	return record._id? "dbid":"localtemp";
}

var dateFromFeed = function(record) {
	return record.listoryDate? record.listoryDate :  Math.max((record.fj_modified_locally || null), (record._date_Modified || null) )
}
var dateStringFromFeed = function(record) {
	//
	return new Date(dateFromFeed(record)).toLocaleDateString();
}
var dateTimeStringFromFeed = function(record) {
	//
	return new Date(dateFromFeed(record)).toString();
}
var addToListAsUnique = function(aList,anItem) {
	if (!aList) {
		return [anItem]
	} else if (!anItem) {
		return aList 
	} else  if (aList.indexOf(anItem) < 0) {
		aList.push(anItem);
	} 
	return aList
}
var addToBeginningOfListAsUnique = function(aList,anItem) {
	if (!aList) {
		return [anItem]
	} else if (!anItem) {
		return aList 
	} else  if (aList.indexOf(anItem) < 0) {
		aList.unshift(anItem);
	} 
	return aList
}
var isANumber = function(aVar=null) {
	if (aVar === null || aVar.length==0 || typeof(aVar) === "boolean") return false;
	return !isNaN(aVar)
}

// Mobile / Desktop / resizing
var isMobile = function() {
	//
	return (/iPhone|iPod|Android/.test(navigator.userAgent) && !window.MSStream);
}
var isMac = function() {
	//
	return  /Mac/.test(navigator.userAgent);
}
var isAndroid = function () {
	//
	return  /Android/.test(navigator.userAgent);
}
var isSmallScreen = function() {
	//
	return (Math.max(window.innerWidth)<500);
}
var isPortrait = function() {
	return (window.innerWidth < window.innerHeight)
}
var hasiPhoneHeader = function () {
	// isPortait is : new pg add - to check
	return (!freezr.app.isWebBased && /iPhone|iPod|iPad/.test(navigator.userAgent) && isPortrait())
}
// Generic utilities
	var toggleMenu = function(menu){
		// uses classnames menuNoShow
		if (menu){
		    var dropdowns = document.getElementsByClassName("menuShow");
		    for (var i = 0; i < dropdowns.length; i++) {if (dropdowns[i] != menu) dropdowns[i].classList.replace("menuShow","menuNoshow")}

			let notShown = menu.classList.contains("menuNoshow");
			menu.classList.replace((notShown?"menuNoshow":"menuShow"),(notShown?"menuShow":"menuNoshow"))
		}
	}
	var hideAllMenus = function(event){
		if (!event.target.matches('.menuDropdownButt') && !event.target.matches('.dropDownKeep')) {
	    var dropdowns = document.getElementsByClassName("menuShow");
	    for (var i = 0; i < dropdowns.length; i++) {toggleMenu(dropdowns[i])}
	    }
	}



	function removeSpaces(aText) {
		aText = aText.replace(/&nbsp;/g," ").trim();
		while (aText.indexOf("  ")>-1) {
			aText = aText.replace(/  /," ");
		}
		return aText;
	}
	function onlineStatus() {
		var networkState;
		if (navigator.connection && navigator.connection.type) {
			networkState = navigator.connection.type;
			
			var states = {};
			states[Connection.UNKNOWN]  = 'Unknown connection';
			states[Connection.ETHERNET] = 'Ethernet connection';
			states[Connection.WIFI]     = 'WiFi connection';
			states[Connection.CELL_2G]  = 'Cell connection';
			states[Connection.CELL_3G]  = 'Cell connection';
			states[Connection.CELL_4G]  = 'Cell connection';
			states[Connection.NONE]     = null;

			return states[networkState];
		} else {
			return null;
		}
	}
	function insertDivAtBeg(parentNode,newNode){
		if (parentNode.firstChild) {
			parentNode.insertBefore(newNode,parentNode.firstChild)
		} else {
			parentNode.appendChild(newNode)
		}
	}
	function removeDiv(aDiv) {
		if (aDiv && aDiv.parentNode) {
			aDiv.parentNode.removeChild(aDiv);
		}
	}

	function incrementName(aText) {
		if (!aText) return "0";
		let startNum = aText.length;
		while (!isNaN(aText.substring(startNum-1)) && startNum>0) {startNum--;}
		return aText.substring(0,startNum)+(startNum == aText.length? 1 : (parseInt(aText.substring(startNum))+1))
	}
	function getListIdxByParam(searchTerm,thelist,param){
		var theItemNum=-1;
		if (thelist && thelist.length>0 && searchTerm && param) {
			for (var i=0; i<thelist.length; i++) {
				if (thelist[i] && (thelist[i][param] == searchTerm )) theItemNum = i;
			}
		}
		return theItemNum;
	}
	function isEmpty(obj) { return (!obj || (Object.keys(obj).length === 0 && obj.constructor === Object))}
	var listFromJSONlist = function(jsonlist, aParam) {
		tempret = [];
		if (jsonlist && jsonlist.length>0) jsonlist.forEach(anObj => { tempret.push(anObj[aParam]) });
		return tempret;
	}
	var compareLists = function(list1,list2) {
		tempret = {'inboth':[],'in1Only':[],'in2Only':[]}
		list1.forEach(anItem => {
			let list2idx = list2.indexOf(anItem);
			if (list2idx >-1) {
				tempret.inboth.push(anItem)
				list2.splice(list2idx,1)
			} else {
				tempret.in1Only.push(anItem)
			}
		})
		tempret.in2Only = list2;
		return tempret;
	}
