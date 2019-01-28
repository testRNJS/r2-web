<!DOCTYPE html><html><?php

///////////////////////////////////////////
///////////////////////////////////////////

const IS_DEBUGGING_ON=true;
const IS_CACHE_ON=false;

include "php/Dev.php";


/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////






		?><head lang="en-GB">
		<title>readium test</title>
    <?php

			Dev::inlineCSS("css/index.css");
			Dev::inlineCSS("css/reset.css");


    ?>


	</head>

    <body >
    <div id="main"></div>



      </body>
     <?php
      	  //Dev::linkJS(array("dist/index.js","../node_modules/@readium/navigator-web/dist/readium-navigator-web.esm.js"));
     Dev::linkJS(array("dist/index.js"));
      	?>
</html>




<?php

    if(IS_CACHE_ON)Dev::createCacheFile(ob_get_contents());

?>
