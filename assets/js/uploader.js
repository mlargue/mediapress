/**
 * A copy of wp.Uploader class
 * @type @exp;window@pro;mpp
 */
/* global pluploadL10n, plupload, _wpPluploadSettings */

window.mpp = window.mpp || {};

(function( exports, $ ) {
	var Uploader;

	if ( typeof _mppUploadSettings === 'undefined' )
		return;

	/**
	 * An object that helps create a WordPress uploader using plupload.
	 *
	 * @param options - object - The options passed to the new plupload instance.
	 *    Accepts the following parameters:
	 *    - container - The id of uploader container.
	 *    - browser   - The id of button to trigger the file select.
	 *    - dropzone  - The id of file drop target.
	 *    - plupload  - An object of parameters to pass to the plupload instance.
	 *    - params    - An object of parameters to pass to $_POST when uploading the file.
	 *                  Extends this.plupload.multipart_params under the hood.
	 *
	 * @param attributes - object - Attributes and methods for this specific instance.
	 */
	Uploader = function( options ) {
		var self = this,
			elements = {
				container: 'container',
				browser:   'browse_button',
				dropzone:  'drop_element',
                
			},
			key, error;

		this.supports = {
			upload: Uploader.browser.supported
		};

		this.supported = this.supports.upload;

		if ( ! this.supported )
			return;

		// Use deep extend to ensure that multipart_params and other objects are cloned.
		this.plupload = $.extend( true, { multipart_params: {} }, Uploader.defaults );
		this.container = document.body; // Set default container.
        
		// Extend the instance with options
		//
		// Use deep extend to allow options.plupload to override individual
		// default plupload keys.
		$.extend( true, this, options );

		// Proxy all methods so this always refers to the current instance.
		for ( key in this ) {
			if ( $.isFunction( this[ key ] ) )
				this[ key ] = $.proxy( this[ key ], this );
		}

		// Ensure all elements are jQuery elements and have id attributes
		// Then set the proper plupload arguments to the ids.
		for ( key in elements ) {
			if ( ! this[ key ] )
				continue;

			this[ key ] = $( this[ key ] ).first();
            //should we allow multiple drop zone? then we will need to remove first() from above
            
            
			if ( ! this[ key ].length ) {
				delete this[ key ];
				continue;
			}

			if ( ! this[ key ].prop('id') )
				this[ key ].prop( 'id', '__mpp-uploader-id-' + Uploader.uuid++ );//If there is no id, generate one for the element
			this.plupload[ elements[ key ] ] = this[ key ].prop('id');
		}
       
		// If the uploader has neither a browse button nor a dropzone, bail.
		if ( ! ( this.browser && this.browser.length ) && ! ( this.dropzone && this.dropzone.length ) )
			return;

		this.uploader = new plupload.Uploader( this.plupload );
		delete this.plupload;
        
		// Set default params and remove this.params alias.
		this.param( this.params || {} );
		delete this.params;

		error = function( message, data, file ) {
            console.log("Error:"+ message);
			if ( file.attachment )
				file.attachment.destroy();

			Uploader.errors.unshift({
				message: message || pluploadL10n.default_error,
				data:    data,
				file:    file
			});

			self.error( message, data, file );
		};

		this.uploader.init();

		this.supports.dragdrop = this.uploader.features.dragdrop && ! Uploader.browser.mobile;

		// Generate drag/drop helper classes.
		(function( dropzone, supported ) {
			var timer, active;

			if ( ! dropzone )
				return;

			dropzone.toggleClass( 'supports-drag-drop', !! supported );

			if ( ! supported )
				return dropzone.unbind('.mpp-uploader');

			// 'dragenter' doesn't fire correctly,
			// simulate it with a limited 'dragover'
			dropzone.bind( 'dragover.mpp-uploader', function(){
				if ( timer )
					clearTimeout( timer );

				if ( active )
					return;

				dropzone.trigger('dropzone:enter').addClass('drag-over');
				active = true;
			});

			dropzone.bind('dragleave.mpp-uploader, drop.mpp-uploader', function(){
				// Using an instant timer prevents the drag-over class from
				// being quickly removed and re-added when elements inside the
				// dropzone are repositioned.
				//
				// See http://core.trac.wordpress.org/ticket/21705
				timer = setTimeout( function() {
					active = false;
					dropzone.trigger('dropzone:leave').removeClass('drag-over');
				}, 0 );
			});
		}( this.dropzone, this.supports.dragdrop ));

		if ( this.browser ) {
			this.browser.on( 'mouseenter', this.refresh );
		} else {
			this.uploader.disableBrowse( true );
			// If HTML5 mode, hide the auto-created file container.
			$('#' + this.uploader.id + '_html5_container').hide();
		}

		this.uploader.bind( 'FilesAdded', function( up, files ) {
			_.each( files, function( file ) {
				var attributes, image;

				// Ignore failed uploads.
				if ( plupload.FAILED === file.status )
					return;
                var original_file = file;    
				// Generate attributes for a new `Attachment` model.
				attributes = _.extend({
					file:      file,
					uploading: true,
					date:      new Date(),
					filename:  file.name,
					menuOrder: 0,
					uploadedTo: wp.media.model.settings.post.id
				}, _.pick( file, 'loaded', 'size', 'percent' ) );

				// Handle early mime type scanning for images.
				image = /(?:jpe?g|png|gif)$/i.exec( file.name );

				// Did we find an image?
				if ( image ) {
					attributes.type = 'image';

					// `jpeg`, `png` and `gif` are valid subtypes.
					// `jpg` is not, so map it to `jpeg`.
					attributes.subtype = ( 'jpg' === image[0] ) ? 'jpeg' : image[0];
				}

				// Create the `Attachment`.
				file.attachment = wp.media.model.Attachment.create( attributes );

				Uploader.queue.add( file.attachment );

				self.added( original_file );
			});

			up.refresh();
			up.start();
		});

		this.uploader.bind( 'UploadProgress', function( up, file ) {
			
			file.attachment.set( _.pick( file, 'loaded', 'percent' ) );
			self.progress( file.attachment );
			
		});

		this.uploader.bind( 'FileUploaded', function( up, file, response ) {
			var complete;
            //var attachment;    
			try {
				response = JSON.parse( response.response );
				
			} catch ( e ) {
				return error( pluploadL10n.default_error, e, file );
			}
           //console.log();
			if ( ! _.isObject( response ))
				return error( pluploadL10n.default_error, null, file );
            else if (  _.isUndefined( response.success ) ||  ! response.success  )
                return error(response.data.message, response.data.message, file );
			

            
			_.each(['loaded','size','percent'], function( key ) {//'file',
				file.attachment.unset( key );
			});

			file.attachment.set( _.extend( response.data, { uploading: false }) );
			//wp.media.model.Attachment.get( response.data.id, file.attachment );

			complete = Uploader.queue.all( function( attachment ) {
				return ! attachment.get('uploading');
			});

			if ( complete ){
				Uploader.queue.reset();
                
            } 
            //console.log(file);
			self.success( file.attachment );
            
           
		});
        
        //should we use this here? or just Uploaded and check our collection?
        //when all files in the current queue is uploaded
        this.uploader.bind( 'UploadComplete', function (up, files ) {
            
           self.complete( up, files );
            
        });
		this.uploader.bind( 'Error', function( up, pluploadError ) {
			var message = pluploadL10n.default_error,
				key;

			// Check for plupload errors.
			for ( key in Uploader.errorMap ) {
				if ( pluploadError.code === plupload[ key ] ) {
					message = Uploader.errorMap[ key ];
					if ( _.isFunction( message ) )
						message = message( pluploadError.file, pluploadError );
					break;
				}
			}

			error( message, pluploadError, pluploadError.file );
			up.refresh();
		});

		this.init();
	};

	// Adds the 'defaults' and 'browser' properties.
	$.extend( Uploader, _mppUploadSettings );

	Uploader.uuid = 0;

	Uploader.errorMap = {
		'FAILED':                 pluploadL10n.upload_failed,
		'FILE_EXTENSION_ERROR':   pluploadL10n.invalid_filetype,
		'IMAGE_FORMAT_ERROR':     pluploadL10n.not_an_image,
		'IMAGE_MEMORY_ERROR':     pluploadL10n.image_memory_exceeded,
		'IMAGE_DIMENSIONS_ERROR': pluploadL10n.image_dimensions_exceeded,
		'GENERIC_ERROR':          pluploadL10n.upload_failed,
		'IO_ERROR':               pluploadL10n.io_error,
		'HTTP_ERROR':             pluploadL10n.http_error,
		'SECURITY_ERROR':         pluploadL10n.security_error,

		'FILE_SIZE_ERROR': function( file ) {
			return pluploadL10n.file_exceeds_size_limit.replace('%s', file.name);
		}
	};

	$.extend( Uploader.prototype, {
        feedback: '#mpp-activity-feedback',
        media_list: '#mpp-activity-media-list',//where we will list the media
        uploading_media_list : _.template ( "<li id='<%= id %>'><span class='mpp-attached-file-name'><%= name %></span>(<span class='mpp-attached-file-size'><%= size %></spa>)<span class='mpp-remove-file-attachment'>x</span> <b></b></li>" ),
        uploaded_media_list : _.template ( "<li class='mpp-uploaded-media-item' id='mpp-uploaded-media-item-<%= id %>'><img src='<%= url %>' /></li>" ),
         
		/**
		 * Acts as a shortcut to extending the uploader's multipart_params object.
		 *
		 * param( key )
		 *    Returns the value of the key.
		 *
		 * param( key, value )
		 *    Sets the value of a key.
		 *
		 * param( map )
		 *    Sets values for a map of data.
		 */
		param: function( key, value ) {
			if ( arguments.length === 1 && typeof key === 'string' )
				return this.uploader.settings.multipart_params[ key ];

			if ( arguments.length > 1 ) {
				this.uploader.settings.multipart_params[ key ] = value;
			} else {
				$.extend( this.uploader.settings.multipart_params, key );
			}
		},

		
		error:    function( reason, data, file ) {
                        if( this.feedback )
                            $('ul li#'+file.id, this.feedback ).addClass('mpp-upload-fail').find('b').html('<span>' + reason + "</span>");
                            //$('ul li#'+file.id, this.feedback ).find('b').html('<span>' + reason + "</span>");
                            console.log(data);
                    },
		success:  function( file ) {
            
                        var sizes = file.get( 'sizes' );
                        var original_url = file.get('url');
                        var id = file.get('id');
                        var file_obj = file.get('file');
						var thumbnail = '';
						if( sizes != undefined )
							thumbnail = sizes.thumbnail;
						else if( file.get('thumb') )
							thumbnail = file.get('thumb');
						
                        var html = '';
                        html = this.uploaded_media_list({id:id, url: thumbnail.url, });

                        $(this.feedback).find('li#'+file_obj.id ).remove();
						//if a place is given to append the media
						if( this.media_list)
							$('ul', this.media_list).append( html);

                        //console.log( thumbnail);

                       // console.log( sizes);
                        //console.log('Url:'+original_url );
                        //console.log('ID:'+ id);
                    },
		        //whena file/files are selected for uploading
		added    : function( file ) {
                //file = file.file;
                //console.log(files);
                var html = ''; 
				
				html = this.uploading_media_list({ id: file.id, name: file.name, size: plupload.formatSize(file.size) });// '<li id="' + file.id + '">' + file.name + ' (' + plupload.formatSize(file.size) + ') <b></b></li>';


				if( this.feedback )
					$( 'ul', this.feedback ).append( html );//append to the list
                ////start the load now
				if( this.onAddFile )
					this.onAddFile( file );
                //$( '.mpp-uploading', this.feedback  ).show();//addClass( 'uploading' );
		},
        progress : function(  file ) {
           
               if( !filename, this.feedback )
				   return;
			   
                 var filename, percent;


                 filename = file.get('file').id;
                 //console.log( filename);
                 percent = file.get('percent');
                // console.log('ul li#'+filename);
                 $('ul li#'+filename, this.feedback ).find('b').html('<span>' + percent + "%</span>");
                
			//$( '#liveblog-messages' ).html( "Uploading: " + filename + ' ' + percent + '%' );
		},

		complete: function() {
			
			//disable loader
		//hide the loader
		if( !this.media_list )
				return;
			//show loader
			jq( '.mpp-loader', this.media_list ).hide();
		},
		clear_media_list: function(){
           
            jq( 'ul', this.media_list ).empty();
			jq( 'ul', this.media_list ).append( jq( '#mpp-loader-wrapper').clone());
        },
        clear_feedback : function (){
            jq( 'ul', this.feedback ).empty();
        },
        
        hide_dropzone : function (){
            jq( this.dropzone ).hide();
        },
        hide_ui : function(){
            
            this.clear_media_list();
            this.clear_feedback();
            this.hide_dropzone();
        },
		onAddFile: function ( file ){
			if( !this.media_list )
				return;
			//show loader
			jq( '.mpp-loader', this.media_list ).show();
		},
		init: function(){
			//add loader to the feedback list
			if( !this.feedback )
				return;
			
			this.clear_media_list();
			//jq('ul', this.media_list).append( jq( '#mpp-loader-wrapper'));
			
		},
		refresh:  function() {
			var node, attached, container, id;

			if ( this.browser ) {
				node = this.browser[0];

				// Check if the browser node is in the DOM.
				while ( node ) {
					if ( node === document.body ) {
						attached = true;
						break;
					}
					node = node.parentNode;
				}

				// If the browser node is not attached to the DOM, use a
				// temporary container to house it, as the browser button
				// shims require the button to exist in the DOM at all times.
				if ( ! attached ) {
					id = 'mpp-uploader-browser-' + this.uploader.id;

					container = $( '#' + id );
					if ( ! container.length ) {
						container = $('<div class="mpp-uploader-browser" />').css({
							position: 'fixed',
							top: '-1000px',
							left: '-1000px',
							height: 0,
							width: 0
						}).attr( 'id', 'mpp-uploader-browser-' + this.uploader.id ).appendTo('body');
					}

					container.append( this.browser );
				}
			}

			this.uploader.refresh();
		}
	});

	Uploader.queue = new wp.media.model.Attachments( [], { query: false });
	Uploader.errors = new Backbone.Collection();

	exports.Uploader = Uploader;
})( mpp, jQuery );


/** If the jQuery Cookie plugin is not included, inclued it*/
var jq = jQuery;
if( jq.cookie == undefined ){
    /* jQuery Cookie plugin */
jQuery.cookie=function(name,value,options){if(typeof value!='undefined'){options=options||{};if(value===null){value='';options.expires=-1;}var expires='';if(options.expires&&(typeof options.expires=='number'||options.expires.toUTCString)){var date;if(typeof options.expires=='number'){date=new Date();date.setTime(date.getTime()+(options.expires*24*60*60*1000));}else{date=options.expires;}expires='; expires='+date.toUTCString();}var path=options.path?'; path='+(options.path):'';var domain=options.domain?'; domain='+(options.domain):'';var secure=options.secure?'; secure':'';document.cookie=[name,'=',encodeURIComponent(value),expires,path,domain,secure].join('');}else{var cookieValue=null;if(document.cookie&&document.cookie!=''){var cookies=document.cookie.split(';');for(var i=0;i<cookies.length;i++){var cookie=jQuery.trim(cookies[i]);if(cookie.substring(0,name.length+1)==(name+'=')){cookieValue=decodeURIComponent(cookie.substring(name.length+1));break;}}}return cookieValue;}};

}
//add media ids to cookie
function mpp_add_media_to_cookie( media_id ) {
    
    var media_list = jq.cookie( '_mpp_activity_attached_media_ids' );//
    //if there was no cookie set , let us add it
    if( ! media_list ) {
        jq.cookie( '_mpp_activity_attached_media_ids', media_id, {
			path: '/'
		} );
        
     return media_id;//all done   
    }
    
    //if we are here, let us update the cookie
    
    var media_ids = media_list.split( ',' );
    
    media_ids.push( media_id );
    
    media_ids = _.uniq( media_ids );//unique ids
   
    media_list = media_ids.join( ',' );//make a list
    //store
    jq.cookie( '_mpp_activity_attached_media_ids', media_list, {
        path: '/'
    } );
    
    return media_ids;
}
