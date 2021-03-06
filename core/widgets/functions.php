<?php

/**
 * Helpers for widgets
 */

function mpp_widget_get_data( $type, $key ){
	$data = mediapress()->get_data( 'widget');//,  = $widget_column;
	
	if( isset( $data[$type][$key] ) )
		return $data[$type][$key];
	
	return false;
	
}

function mpp_widget_save_data( $type, $key, $value  ) {
	
	$data = mediapress()->get_data( 'widget');//,  = $widget_column;
	
	if( ! $data )
		$data = array();
	
	$data[$type][$key] = $value;
	
	mediapress()->add_data( 'widget', $data );	
	
}

function mpp_widget_reset_data( $type, $key = null ){
	
	$data = mediapress()->get_data( 'widget');//,  = $widget_column;
	
	if( !$key )
		unset( $data[$type] );
	else
		unset( $data[$type][$key]);
	
	mediapress()->add_data( 'widget', $data );//save the updated data	
	
}


/** Gallery*/

function mpp_widget_get_gallery_data( $key ){
	
	return mpp_widget_get_data('gallery', $key );
}

function mpp_widget_save_gallery_data( $key, $value ){
	
	return mpp_widget_save_data('gallery', $key, $value  );
}


function mpp_widget_reset_gallery_data( $key = null ) {
	
	return mpp_widget_reset_data( 'gallery', $key );
	
}
/** Media **/

function mpp_widget_get_media_data( $key ){
	
	return mpp_widget_get_data( 'media', $key );
}

function mpp_widget_save_media_data( $key, $value ){
	
	return mpp_widget_save_data( 'media', $key, $value  );
}


function mpp_widget_reset_media_data( $key = null ) {
	
	return mpp_widget_reset_data( 'media', $key );
	
}
