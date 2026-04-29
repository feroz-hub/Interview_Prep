using System.Reflection;

namespace Reflection
{
    internal class Program
    {
        static void Main(string[] args)
        {
            // Get the version number of the current assembly
            Assembly assembly = Assembly.GetExecutingAssembly();
            AssemblyName assemblyName = assembly.GetName();
            Version version = assemblyName.Version;
            string versionString = version.ToString();

            // Print the version number to the console
            Console.WriteLine("Assembly version: " + versionString);

            string methodName = "Mul";
            MyClass obj = new MyClass();

            // Get a reference to the method using reflection
            Type t = obj.GetType();
            MethodInfo method = t.GetMethod(methodName);

            // Call the method using reflection
            object[] arguments = new object[] { 10, 5 };
            method.Invoke(obj, arguments);

            Console.ReadLine();

            //Output: 50
        }
    }

}
