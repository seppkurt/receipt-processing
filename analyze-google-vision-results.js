const GoogleVisionService = require('./src/services/google-vision');
const fs = require('fs');
const path = require('path');

async function analyzeAllImages() {
  try {
    console.log('🔍 Comprehensive Google Cloud Vision Analysis...\n');
    
    // Initialize the service
    const googleVision = new GoogleVisionService();
    
    // Create results directory
    const resultsDir = path.join(__dirname, 'google-vision-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir);
    }
    
    // Get all test images
    const testDir = path.join(__dirname, 'images/test');
    const testImages = fs.readdirSync(testDir)
      .filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg'))
      .map(file => path.join(testDir, file));
    
    if (testImages.length === 0) {
      console.log('❌ No test images found in images/test directory');
      return;
    }
    
    console.log(`📁 Found ${testImages.length} test images:`);
    testImages.forEach(img => console.log(`   - ${path.basename(img)}`));
    console.log('');
    
    const summary = {
      total_images: testImages.length,
      processed_images: 0,
      failed_images: 0,
      total_text_length: 0,
      average_confidence: 0,
      results: []
    };
    
    // Process each image
    for (const imagePath of testImages) {
      const imageName = path.basename(imagePath, path.extname(imagePath));
      console.log(`🔍 Processing: ${path.basename(imagePath)}`);
      
      try {
        // Process the image
        const result = await googleVision.processImage(imagePath);
        
        // Convert to markdown
        const markdown = googleVision.convertToMarkdown(result);
        
        // Save raw text
        const rawTextFile = path.join(resultsDir, `${imageName}-raw.txt`);
        fs.writeFileSync(rawTextFile, result.text);
        
        // Save markdown
        const markdownFile = path.join(resultsDir, `${imageName}-markdown.md`);
        fs.writeFileSync(markdownFile, markdown);
        
        // Save detailed JSON result
        const jsonFile = path.join(resultsDir, `${imageName}-detailed.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(result, null, 2));
        
        // Update summary
        summary.processed_images++;
        summary.total_text_length += result.text.length;
        summary.average_confidence += result.confidence;
        
        summary.results.push({
          image: path.basename(imagePath),
          text_length: result.text.length,
          confidence: result.confidence,
          processing_info: result.processing_info,
          files: {
            raw_text: `${imageName}-raw.txt`,
            markdown: `${imageName}-markdown.md`,
            detailed: `${imageName}-detailed.json`
          }
        });
        
        console.log(`   ✅ Saved results to ${resultsDir}/`);
        console.log(`   📄 Text length: ${result.text.length} characters`);
        console.log(`   🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${path.basename(imagePath)}:`, error.message);
        summary.failed_images++;
        
        summary.results.push({
          image: path.basename(imagePath),
          error: error.message
        });
      }
      
      console.log('');
    }
    
    // Calculate averages
    if (summary.processed_images > 0) {
      summary.average_confidence = summary.average_confidence / summary.processed_images;
      summary.average_text_length = summary.total_text_length / summary.processed_images;
    }
    
    // Save summary
    const summaryFile = path.join(resultsDir, 'analysis-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    // Create a comprehensive report
    const reportFile = path.join(resultsDir, 'analysis-report.md');
    let report = `# Google Cloud Vision Analysis Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- **Total Images:** ${summary.total_images}\n`;
    report += `- **Successfully Processed:** ${summary.processed_images}\n`;
    report += `- **Failed:** ${summary.failed_images}\n`;
    report += `- **Average Text Length:** ${summary.average_text_length ? summary.average_text_length.toFixed(0) : 0} characters\n`;
    report += `- **Average Confidence:** ${(summary.average_confidence * 100).toFixed(1)}%\n\n`;
    
    report += `## Detailed Results\n\n`;
    
    summary.results.forEach(result => {
      report += `### ${result.image}\n\n`;
      if (result.error) {
        report += `❌ **Error:** ${result.error}\n\n`;
      } else {
        report += `✅ **Successfully processed**\n\n`;
        report += `- **Text Length:** ${result.text_length} characters\n`;
        report += `- **Confidence:** ${(result.confidence * 100).toFixed(1)}%\n`;
        report += `- **Files Generated:**\n`;
        report += `  - Raw Text: \`${result.files.raw_text}\`\n`;
        report += `  - Markdown: \`${result.files.markdown}\`\n`;
        report += `  - Detailed JSON: \`${result.files.detailed}\`\n\n`;
      }
    });
    
    fs.writeFileSync(reportFile, report);
    
    console.log('📊 Analysis Complete!');
    console.log(`📁 Results saved to: ${resultsDir}/`);
    console.log(`📄 Summary: ${summary.processed_images}/${summary.total_images} images processed successfully`);
    console.log(`📏 Average text length: ${summary.average_text_length ? summary.average_text_length.toFixed(0) : 0} characters`);
    console.log(`🎯 Average confidence: ${(summary.average_confidence * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

analyzeAllImages(); 