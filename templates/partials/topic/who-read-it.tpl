<i class="fa fa-check fa-fw" title="Who Read It" component="topic/who-read-it-count"></i>
<div component="topic/who-read-it" >

	{{{ each whoreadit }}}
	<div data-uid="{./uid}">
	<a href="{config.relative_path}/user/{./userslug}" class="text-decoration-none">
		
			
	{{{ if ./picture }}}
        <img alt="{./username}" title="{./username}: {./readtimestamp}" loading="lazy" class="avatar not-responsive avatar-rounded" component="avatar/picture" src="{./picture}" style="--avatar-size: 24px;" onerror="this.remove();" itemprop="image"> {./username}: {./readtimestamp}
	{{{ else }}}
		<span alt="{./username}" title="{./username}: {./readtimestamp}" loading="lazy" class="avatar not-responsive avatar-rounded" component="avatar/icon" style="--avatar-size: 24px; background-color:{./icon:bgColor}">{./icon:text}</span> {./username}: {./readtimestamp}
	{{{ end }}}
</a>

		 
	</div>
	</br>
	
	{{{ end }}}
	
</div>

