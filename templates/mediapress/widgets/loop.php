<?php
/**
 * 
 */
$query = mpp_widget_get_media_data('query' );?>
<?php if( $query->have_media() ):?>

<div class="mpp-container mpp-widget-container mpp-media-widget-container mpp-media-video-widget-container">
	<div class='mpp-g mpp-item-list mpp-media-list mpp-video-list'>
	<?php while( $query->have_media() ): $query->the_media(); ?>

		<div class="<?php mpp_media_class( 'mpp-widget-item mpp-widget-media-item '. mpp_get_grid_column_class( 1 ) );?>">
				<div class='mpp-item-entry mpp-media-entry mpp-photo-entry'>
					<a href="<?php mpp_media_permalink() ;?>" class="mpp-item-thumbnail mpp-media-thumbnail mpp-photo-thumbnail">
						<img src="<?php mpp_media_src('thumbnail') ;?>" alt="<?php mpp_media_title();?> "/>
					</a>
				</div>		
				<a href="<?php mpp_media_permalink() ;?>" class="mpp-item-title mpp-media-title mpp-photo-title"><?php mpp_media_title() ;?></a>
				<div class="mpp-item-actions mpp-media-actions mpp-photo-actions">
					<?php mpp_media_action_links();?>
				</div>
			</div>

	<?php endwhile; ?>

<?php mpp_reset_media_data(); ?>
	</div>
</div>	
<?php endif; ?>