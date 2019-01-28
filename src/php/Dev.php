<?php         



// sass compilation
include "php/scss.inc.php";  
use Leafo\ScssPhp\Compiler;  
 
 
const CACHE_ON=false; // if there is no cached file a new one will be created

 

//if (substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip')) ob_start("ob_gzhandler"); else ob_start();

// ERROR REPORTING ////////// 
$error_reporting=defined('REPORT_PHP_ERRORS')?REPORT_PHP_ERRORS:false;
if($error_reporting){
  error_reporting(-1);
	ini_set('display_errors', 1);
}else{                   
	error_reporting(0); 
	ini_set('display_errors', 0);
	}
//////////////////////////// 

$__filename=basename(__FILE__, '.php');
$__cachefile = "cache/$__filename.html";


                 
		// if cache is being used and there is a cached file, it's loaded and the script terminates.		            
		if (file_exists($__cachefile)&&CACHE_ON){ 
				//echo "<!-- Cached ".date('H:i', filemtime($__cachefile))." -->";
       	include($__cachefile);
				exit;
    } 
    //-----------------------------------------------------------------------------------------//
    
    
    if(CACHE_ON||Dev::CREATE_DIST)ob_start(); // starts buffer capturing if caching is on    

                           
			


class Dev{
		
	// VALUES TO EDIT --------------------------------------------//	
	// JAVASCRIPT
  // order is relevant
      
  	const JS_FILES=JS_FILES; 
  	const RENDER_JS=0;// 0: linked; 1:inline; 2:external single file; 3:inline minified; 4:external single file minified 
			
		// CSS
		const CSS_FILES=CSS_FILES;
		const RENDER_CSS=0;// 0: linked; 1:inline; 2:external single file; 3:inline minified; 4:external single file minified
	  
	  
	  const CREATE_DIST=false;//"../dist/index.html";	// replace by output filename+extension string, false for no output
	
	  
	  
	  
	  
		// path/filenames for the minified files. Can be deleted or set to null if unuseds
		const CSS_MIN_URI="css/__css.css";
		const JS_MIN_URI="js/__js.js";
	
	  // non-minified files are useful for debugging
	  const RENDER_CSS_IN_PAGE=false; // if there are paths, setting this to true will lead to errors
	  const RENDER_JS_IN_PAGE=false;
	
	  // minified files optimize performance. Run the compiler once before setting ONE of these to true
	  // and set $RENDER_CSS_IN_PAGE and $RENDER_JS_IN_PAGE to false
	  const LINK_MINIFIED_FILES=false;
	  const INCLUDE_MINIFIED_FILES=false;
	
	  
	  // if PREPROCESS is true, this allows minifying, embedding of the code, etc etc.
	  // better to leave it for the final release
	  const PREPROCESS=false;
  //--------------------------------------------------------------//
    
    
    static $scss;
  
    function __construct() {
    
    //-- TEMPORARY PATCH FOR COMPILING SASS ---//
		//-- inlines  sass in <head> 
		
		  
		
		
		
	  ///--------------------------------------//	
    	
    }
/*  
public static function processHead(){     
	   
	   $JS=self::JS_FILES;
	   $CSS=self::CSS_FILES;
	   
	   	switch(self::RENDER_JS){
		   	case 0: 
		   	self::linkJS($JS);
		   	break;		
		   	
		   	case 1:
		   	self::inlineJS($JS);
		   	break;	
		   	
		   	case 2:
		   	self::inlineMinifiedJS($JS);
		   	break;	
		   	
		   	case 3:
		   	break;
		   	
		   	case 4:
		   	break;	
	   	
	  	}
	  	
	  	
	  	switch(self::RENDER_CSS){
		   	case 0: 
		   	self::linkCSS($CSS);
		   	break;		
		   	
		   	case 1:
		   	self::inlineCSS($CSS);
		   	break;	
		   	
		   	case 2:
		   	break;	
		   	
		   	case 3:
		   	break;
		   	
		   	case 4:
		   	break;	
	   	
	  	}
	   
	  
  	
  	 
  	 
		}// end proceed   
		
*/
public static function inlineSass($path="sass/index.scss"){
	 
	 self::$scss = new Compiler();
		self::$scss->setImportPaths('sass/');      
		if(IS_DEBUGGING_ON)
			self::$scss->setFormatter('Leafo\ScssPhp\Formatter\Expanded');
			else
			self::$scss->setFormatter('Leafo\ScssPhp\Formatter\Crunched');
				 
	 try {
    	$src=fread(fopen($path,'r'), filesize($path));  
    	$sass_output=self::$scss->compile($src);
    	echo '<style type="text/css">'.self::stripComments($sass_output).'</style>';
    	
		} catch (\Exception $e) {  
			
    	echo "<br>SASS<br>$e<br>";
    	syslog(LOG_ERR, 'scssphp: Unable to compile content');
		}
	
	
}		
		

public static function linkJS($src,$type="text/javascript"){
	
	$files=(gettype($src)=="string")?array($src):$src;	
	foreach($files as $v)echo "<script type=\"$type\" src=\"$v\"></script>";

} 


 public static function linkCSS($src){
	
	$files=(gettype($src)=="string")?array($src):$src;
	foreach($files as $v)echo "<link rel=\"stylesheet\" href=\"$v\" >";

} 





        /*
public static function inlineJS($src,$type="text/javascript"){
	    
	    $files=(gettype($src)=="string")?array($src):$src;
	    
			echo "<script type=\"$type\">";
			ob_start();
			foreach($files as $v){
				include $v;
				echo "\n";
			}
			$included_js=ob_get_contents(); 
			ob_end_clean(); 
			echo $included_js;
			echo "</script>";

}  

    */

    
public static function inlineCSS($src){
	
	$files=(gettype($src)=="string")?array($src):$src;
		 
	echo '<style type="text/css">';
		//ob_start();
		foreach($files as $v){
			include self::stripComments($v);
			echo "\n";
		}
		//$included_js=ob_get_contents();
		//ob_end_clean(); 
		//file_put_contents(self::JS_MIN_URI,$included_js);
	  echo "</style>";
			
}
 





    /*
public static function inlineJS($src,$type="text/javascript"){
	
	$send=(gettype($src)=="string")?array($src):$src;
		
	self::standardInlineJS($send,$type);	
	
}
  */



private static function stripComments($src){
	

	$src = preg_replace('!/\*.*?\*/!s', '', $src);
	$src = preg_replace('/\n\s*\n/', "\n", $src);
	$src = preg_replace('/[^:]\/\/[^\n]*/', "\n", $src);    
	$src = preg_replace('/[\s]*[\n]+/', "\n", $src);
	//$src= preg_replace("/\r\n+|\r+|\n+|\t+/i", " ", $src);		
	
	return $src;
	
}
	




public static function inlineJS($src){ 
	  
	  $files=(gettype($src)=="string")?array($src):$src;
	
	  echo '<script type="text/javascript">';
		//ob_start();
		foreach($files as $v){
			include $v;//self::stripComments($v);
			echo "\n";
		}
		//$included_js=ob_get_contents();
		//ob_end_clean(); 
		//file_put_contents(self::JS_MIN_URI,$included_js);
	  echo "</script>";
}




public static function inlineMinifiedJS($src){ 
	  
	  $files=(gettype($src)=="string")?array($src):$src;
	
	  echo '<script type="text/javascript">';
		ob_start();
		foreach($files as $v){
			include $v;
			echo "\n";
		}
		$included_js=ob_get_contents();
		ob_end_clean();      
		
		echo self::stripComments($included_js); 
		//file_put_contents(self::JS_MIN_URI,$included_js);
	  echo "</script>";
}





private static function preprocess(){

    // include/link the minified version on js/css, requires the compiler to have been run at least once
    $CREATE_MINIFIED_FILES=(self::LINK_MINIFIED_FILES||self::INCLUDE_MINIFIED_FILES)?true:false;

    ////////////////////////////

    ////// PHP DEFAULTS  -- things should work without fiddling here.
    $included_css="";
    $included_js="";
    $create_minified_files=true;
    ///////////////////////////

		
		// css & js is stored in variables. Then they are output to the html, stored in external files, or whatever.
		
		// CSS /////////////////		
		ob_start();
		foreach(self::CSS_FILES as $v)include $v;
		$included_css=ob_get_contents();
		ob_end_clean();
		if(self::INCLUDE_MINIFIED_FILES){
			// fixing image and font paths for inclusion
			// ASSUMED PATHS
			// ROOT/im/		for images
			// ROOT/css/fonts/ 		for fonts
			$included_css=str_replace("fonts/","css/fonts/",$included_css);
			$included_css=str_replace("../im/","im/",$included_css);
			
			$included_css=self::stripComments($included_css);
			
		}
		
		// JS /////////////////
		// TO DO: replace Uglify call for exec(yui.jar) calls
		include $_SERVER['DOCUMENT_ROOT']."/_scripts/php/UGLY.php";
		
		$ug = new UglifyJS();
		
		
		
		foreach(self::JS_FILES as $v)$ug->add($v);
		
		ob_start();
		$ug->write(true);
		$included_js=ob_get_contents();
		ob_end_clean();
		
		///////////////////////
		
		
		if($CREATE_MINIFIED_FILES){
			file_put_contents(self::CSS_MIN_URI,$included_css);
			file_put_contents(self::JS_MIN_URI,$included_js);
		
			}
		
		
		 echo '<div style="position:absolute;z-index:99999;width:100%;font-size:1em;font-family:arial,sans;background:rgba(200,200,40,.4);border:2px green solid;color:#111;padding:4px;">COMPILER INCLUDED</div>';

}// end preprocess    





public static function checkPortableDevice(){

		$portable=false;
		if(strstr(self::$agent, 'Android')){
			//$browser="AND";//android chrome
			$portable=true;// avoiding hotlinking
			}
		if(strstr(self::$agent, 'iPhone')||strstr(self::$agent, 'iPad')){
			//$browser="SAF";
			$portable=true;
			}

		if($portable)header("Location:m.index.php");


}





private static function renderCSS($min){
	

	if(self::LINK_MINIFIED_FILES){
		echo "<link rel=\"stylesheet\" href=$min >";
		return;
		}

    if(self::INCLUDE_MINIFIED_FILES){
		echo "<style>";
		include $min;
		echo"</style>";
		return;
		}

	if(self::RENDER_CSS_IN_PAGE){
		echo "<style>";
		foreach(self::CSS_FILES as $v)include $v;
		echo"</style>";
		return;
		}

	foreach(self::CSS_FILES as $v)echo "<link rel=\"stylesheet\" href=\"$v\" >";
}



private static function renderJS($min){
	
    if(self::LINK_MINIFIED_FILES){
		echo "<script type=\"text/javascript\" src=$min ></script>";
		return;
		}

    if(self::INCLUDE_MINIFIED_FILES){
		echo "<script type=\"text/javascript\">";
		include $min;
		echo"</script>";
		return;
		}

	if(self::RENDER_JS_IN_PAGE){
		echo "<script type=\"text/javascript\">";
		foreach(self::JS_FILES as $v){
			include $v;
			echo"\n";
			}//echo "<script type=\"text/javascript\" src=\"$v\"></script>";
		echo "</script>";
		return;
		}

	foreach(self::JS_FILES as $v){
		
		/*/-- for files that depend on variables generated on php
		//-- (for example, js that requires something like var dir="<php echo dir; >"
		$exp=explode(".",$v);  
		if(end($exp)=="php"){
			echo "<script type=\"text/javascript\" >";
			include $v;		
			echo "</script>";
			continue;
				
		}
		//--*/
		
		echo "<script type=\"text/javascript\" src=\"$v\"></script>";
		}


}



private static $agent="";
private static $browser="FF4";

private static function UA(){

		self::$agent=$_SERVER['HTTP_USER_AGENT'];
		$ag=self::$agent;

		self::$browser=self::checkBrowser(self::$agent);
		//echo "return:".self::browser;
	}
	
public static function getAgent(){return self::$agent;}	
public static function getBrowser(){return self::$browser;}

private static function checkBrowser($a){
		//echo "a:$a\n"."----->".strstr($a,"AppleWebKit")."\n";
		if(strstr($a,"Mac OS X"))return "SafariIos";

	}


		
		
}// end Dev

       
//-----------------




?>