import ExpoModulesCore
import ExpoUI
import SwiftUI

final class MenuLabelTextProps: UIBaseViewProps {
  @Field var text: String = ""
}

struct MenuLabelTextView: ExpoSwiftUI.View {
  @ObservedObject var props: MenuLabelTextProps

  var body: some View {
    // One concatenated Text keeps the chevron after the last word when the text wraps;
    // beside it in a stack, it would follow the widest line. The no-break space keeps them together.
    Text(props.text + "\u{00A0}")
      + Text(Image(systemName: "chevron.down")).foregroundColor(Color(uiColor: .secondaryLabel))
  }
}

public final class MenuLabelTextModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MenuLabelText")

    // Registered through ExpoUI so its view modifiers (font, frame...) apply like on its own views.
    ExpoUIView(MenuLabelTextView.self)
  }
}
