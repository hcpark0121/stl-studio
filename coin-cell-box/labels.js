// Adjacent pixels overlap 0.02mm to avoid point-only contacts in STL.
// Original compact block lettering: 0.6mm strokes, 3mm tall, 13.8mm long.
const GLYPHS={
 C:['111','100','100','100','111'], R:['110','101','110','101','101'],
 0:['111','101','101','101','111'],1:['010','110','010','010','111'],
 2:['111','001','111','100','111'],3:['111','001','111','001','111'],
 4:['101','101','111','001','001'],5:['111','100','111','001','111'],
 6:['111','100','111','101','111']
};
export function labelRects(block,text){
 const pitch=.6,length=(text.length*4-1)*pitch,startY=block.y+(block.h-length)/2,rects=[];
 for(const [i,char] of [...text].entries()){
  const glyph=GLYPHS[char];if(!glyph)throw Error(`Unsupported label character: ${char}`);
  for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyph[row][col]==='1')
   rects.push({x:block.x+.9+row*pitch-.01,y:startY+i*4*pitch+col*pitch-.01,w:pitch+.02,h:pitch+.02});
 }
 return rects;
}
