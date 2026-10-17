Pod::Spec.new do |s|
  s.name           = 'MenuLabelText'
  s.version        = '1.0.0'
  s.summary        = 'A Text that ends in a chevron, as the label of a tap-to-open Menu'
  s.author         = ''
  s.homepage       = 'https://github.com/leopalatto20/crowbar'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'ExpoUI'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
  s.source_files = "**/*.swift"
end
