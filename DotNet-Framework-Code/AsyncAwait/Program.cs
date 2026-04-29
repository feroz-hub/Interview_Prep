namespace AsyncAwait
{
    internal class Program
    {
        static async void Main(string[] args)
        {
           MyClass myClass = new MyClass();
           await myClass.Main();
        }       
    }


}